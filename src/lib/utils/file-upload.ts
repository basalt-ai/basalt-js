import GenerateUploadUrlEndpoint from "../endpoints/files/generate-upload-url";
import type { AsyncResult, IApi } from "../resources/contract";
import type { FileAttachment } from "../resources/dataset/file-attachment.types";
import { withBasaltSpan } from "../telemetry";
import { BASALT_ATTRIBUTES } from "../telemetry/attributes";
import { FileUploadError } from "./errors";
import { err, ok } from "./utils";

/**
 * Response from presigned URL generation
 */
interface PresignedUploadResponse {
	upload_url: string;
	file_key: string;
	expires_at: string;
	max_size_bytes: number;
}

/**
 * Uploads a file and returns its file_key
 *
 * @param api - The API interface for making requests
 * @param attachment - The file attachment to upload
 * @returns The file_key to use in dataset values
 */
export async function uploadFile(
	api: IApi,
	attachment: FileAttachment,
): AsyncResult<string> {
	return withBasaltSpan(
		"@basalt-ai/sdk",
		"basalt.file.upload",
		{
			[BASALT_ATTRIBUTES.OPERATION]: "upload",
		},
		async (span) => {
			// 1. Detect content type
			const contentType = await detectContentType(attachment);
			span.setAttribute("basalt.file.content_type", contentType);

			// 2. Get file size for validation
			const size = await attachment.getSize();
			if (size !== undefined) {
				span.setAttribute("basalt.file.size_bytes", size);
			}

			// Capture input
			span.setInput({
				filename: attachment.getFilename(),
				contentType,
				...(size !== undefined && { size }),
			});

			// 3. Request presigned URL
			const presignedResult = await getPresignedUrl(
				api,
				attachment.getFilename(),
				contentType,
				size,
			);

			if (presignedResult.error) {
				span.setAttribute(BASALT_ATTRIBUTES.REQUEST_SUCCESS, false);
				// Capture error output
				span.setOutput({ error: presignedResult.error.message });
				return err(presignedResult.error);
			}

			const presigned = presignedResult.value;
			span.setAttribute("basalt.file.max_size_bytes", presigned.max_size_bytes);

			// 4. Validate file size
			if (size && size > presigned.max_size_bytes) {
				span.setAttribute(BASALT_ATTRIBUTES.REQUEST_SUCCESS, false);
				const errorMsg = `File size ${size} bytes exceeds maximum ${presigned.max_size_bytes} bytes`;
				// Capture error output
				span.setOutput({ error: errorMsg });
				return err(
					new FileUploadError({
						message: errorMsg,
						filename: attachment.getFilename(),
					}),
				);
			}

			// 5. Upload to S3
			const uploadResult = await uploadToS3(
				presigned.upload_url,
				attachment,
				contentType,
			);

			if (uploadResult.error) {
				span.setAttribute(BASALT_ATTRIBUTES.REQUEST_SUCCESS, false);
				// Capture error output
				span.setOutput({ error: uploadResult.error.message });
				return err(uploadResult.error);
			}

			span.setAttribute(BASALT_ATTRIBUTES.REQUEST_SUCCESS, true);

			// Capture successful output - the file key
			span.setOutput({ fileKey: presigned.file_key });

			// 6. Return file_key
			return ok(presigned.file_key);
		},
	);
}

/**
 * Requests a presigned URL from the API
 */
async function getPresignedUrl(
	api: IApi,
	filename: string,
	contentType: string,
	size?: number,
): AsyncResult<PresignedUploadResponse> {
	return api.invoke(GenerateUploadUrlEndpoint, {
		filename,
		content_type: contentType,
		size_bytes: size,
	});
}

/**
 * Uploads file content to S3 using presigned URL
 */
async function uploadToS3(
	uploadUrl: string,
	attachment: FileAttachment,
	contentType: string,
): AsyncResult<void> {
	try {
		// Convert file source to uploadable body
		const body = await prepareUploadBody(attachment);

		// Make PUT request to S3 (direct to S3, not through API client)
		const response = await fetch(uploadUrl, {
			method: "PUT",
			body,
			headers: {
				"Content-Type": contentType,
			},
		});

		if (!response.ok) {
			return err(
				new FileUploadError({
					message: `S3 upload failed with status ${response.status}`,
					filename: attachment.getFilename(),
				}),
			);
		}

		return ok(undefined);
	} catch (error) {
		return err(
			new FileUploadError({
				message: `Failed to upload file: ${error instanceof Error ? error.message : "Unknown error"}`,
				filename: attachment.getFilename(),
			}),
		);
	}
}

/**
 * Prepares the body for S3 upload based on file source type
 */
async function prepareUploadBody(
	attachment: FileAttachment,
): Promise<BodyInit> {
	if (attachment.isFile() || attachment.isBlob()) {
		return attachment.source;
	}

	if (attachment.isBuffer()) {
		// Convert Buffer to Blob for upload
		// Use Uint8Array to ensure proper ArrayBuffer type compatibility
		return new Blob([new Uint8Array(attachment.source)]);
	}

	if (attachment.isPath()) {
		// Node.js environment - read file using fs
		const buffer = await readFileFromPath(attachment.source);
		return new Uint8Array(buffer);
	}

	throw new Error("Unsupported file source type");
}

/**
 * Reads file from filesystem (Node.js only)
 */
async function readFileFromPath(path: string): Promise<Buffer> {
	try {
		// Dynamic import for Node.js fs/promises
		const fs = await import("node:fs/promises");
		return await fs.readFile(path);
	} catch (error) {
		throw new Error(
			`Failed to read file from path: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

/**
 * Detects content type for the file
 */
async function detectContentType(attachment: FileAttachment): Promise<string> {
	// 1. Check explicit override
	if (attachment.options.contentType) {
		return attachment.options.contentType;
	}

	// 2. Check File.type (browser)
	if (attachment.isFile() && attachment.source.type) {
		return attachment.source.type;
	}

	// 3. Use mime-types library to detect from filename
	const mime = await getMimeType(attachment.getFilename());
	if (mime) {
		return mime;
	}

	// 4. Default fallback
	return "application/octet-stream";
}

/**
 * Gets MIME type using mime-types library
 */
async function getMimeType(filename: string): Promise<string | null> {
	try {
		// Dynamic import to handle both Node.js and browser
		const mime = await import("mime-types");
		return mime.lookup(filename) || null;
	} catch {
		// mime-types not available or failed to load
		return null;
	}
}
