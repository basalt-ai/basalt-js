import GenerateUploadUrlEndpoint from "../lib/endpoints/files/generate-upload-url";
import { FileAttachment } from "../lib/resources/dataset/file-attachment.types";
import { uploadFile } from "../lib/utils/file-upload";

declare global {
	var fetch: jest.Mock;
}

const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockApi = {
	invoke: jest.fn(),
};

describe("uploadFile", () => {
	beforeEach(() => {
		mockFetch.mockReset();
		mockApi.invoke.mockReset();
	});

	describe("happy path", () => {
		test("successfully uploads a Blob and returns file_key", async () => {
			const blob = new Blob(["test content"], { type: "text/plain" });
			const attachment = new FileAttachment(blob, { filename: "test.txt" });

			// Mock presigned URL generation
			mockApi.invoke.mockResolvedValueOnce({
				error: null,
				value: {
					upload_url: "https://s3.amazonaws.com/bucket/test?signature=xyz",
					file_key: "files/test-123.txt",
					expires_at: "2025-12-23T10:00:00Z",
					max_size_bytes: 10485760,
				},
			});

			// Mock S3 upload success
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
			});

			const result = await uploadFile(mockApi, attachment);

			expect(result.error).toBeNull();
			expect(result.value).toBe("files/test-123.txt");
		});

		test("successfully uploads a Buffer", async () => {
			const buffer = Buffer.from("binary content");
			const attachment = new FileAttachment(buffer, { filename: "data.bin" });

			mockApi.invoke.mockResolvedValueOnce({
				error: null,
				value: {
					upload_url: "https://s3.amazonaws.com/bucket/data",
					file_key: "files/data-456.bin",
					expires_at: "2025-12-23T10:00:00Z",
					max_size_bytes: 10485760,
				},
			});

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
			});

			const result = await uploadFile(mockApi, attachment);

			expect(result.error).toBeNull();
			expect(result.value).toBe("files/data-456.bin");
		});
	});

	describe("presigned URL generation", () => {
		test("calls GenerateUploadUrlEndpoint with correct parameters", async () => {
			const blob = new Blob(["content"], { type: "image/png" });
			const attachment = new FileAttachment(blob, { filename: "photo.png" });

			mockApi.invoke.mockResolvedValueOnce({
				error: null,
				value: {
					upload_url: "https://s3.amazonaws.com/test",
					file_key: "files/photo.png",
					expires_at: "2025-12-23T10:00:00Z",
					max_size_bytes: 10485760,
				},
			});

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
			});

			await uploadFile(mockApi, attachment);

			expect(mockApi.invoke).toHaveBeenCalledWith(
				GenerateUploadUrlEndpoint,
				expect.objectContaining({
					filename: "photo.png",
					content_type: "image/png",
				}),
			);
		});

		test("includes size_bytes for Blob sources", async () => {
			const content = "test content here";
			const blob = new Blob([content], { type: "text/plain" });
			const attachment = new FileAttachment(blob, { filename: "test.txt" });

			mockApi.invoke.mockResolvedValueOnce({
				error: null,
				value: {
					upload_url: "https://s3.amazonaws.com/test",
					file_key: "files/test.txt",
					expires_at: "2025-12-23T10:00:00Z",
					max_size_bytes: 10485760,
				},
			});

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
			});

			await uploadFile(mockApi, attachment);

			expect(mockApi.invoke).toHaveBeenCalledWith(
				GenerateUploadUrlEndpoint,
				expect.objectContaining({
					size_bytes: content.length,
				}),
			);
		});

		test("includes size_bytes for Buffer sources", async () => {
			const buffer = Buffer.from("buffer content");
			const attachment = new FileAttachment(buffer, { filename: "test.bin" });

			mockApi.invoke.mockResolvedValueOnce({
				error: null,
				value: {
					upload_url: "https://s3.amazonaws.com/test",
					file_key: "files/test.bin",
					expires_at: "2025-12-23T10:00:00Z",
					max_size_bytes: 10485760,
				},
			});

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
			});

			await uploadFile(mockApi, attachment);

			expect(mockApi.invoke).toHaveBeenCalledWith(
				GenerateUploadUrlEndpoint,
				expect.objectContaining({
					size_bytes: buffer.length,
				}),
			);
		});

		test("returns error when presigned URL generation fails", async () => {
			const blob = new Blob(["test"]);
			const attachment = new FileAttachment(blob, { filename: "test.txt" });

			mockApi.invoke.mockResolvedValueOnce({
				error: {
					message: "Failed to generate presigned URL",
				},
				value: null,
			});

			const result = await uploadFile(mockApi, attachment);

			expect(result.error).not.toBeNull();
			expect(result.error?.message).toBe("Failed to generate presigned URL");
			expect(mockFetch).not.toHaveBeenCalled();
		});
	});

	describe("file size validation", () => {
		test("allows upload when file size is less than max_size_bytes", async () => {
			const blob = new Blob(["small"], { type: "text/plain" });
			const attachment = new FileAttachment(blob, { filename: "small.txt" });

			mockApi.invoke.mockResolvedValueOnce({
				error: null,
				value: {
					upload_url: "https://s3.amazonaws.com/test",
					file_key: "files/small.txt",
					expires_at: "2025-12-23T10:00:00Z",
					max_size_bytes: 10485760, // 10MB
				},
			});

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
			});

			const result = await uploadFile(mockApi, attachment);

			expect(result.error).toBeNull();
			expect(mockFetch).toHaveBeenCalled();
		});

		test("allows upload when file size equals max_size_bytes", async () => {
			const blob = new Blob(["x".repeat(100)], { type: "text/plain" });
			const attachment = new FileAttachment(blob, { filename: "exact.txt" });

			mockApi.invoke.mockResolvedValueOnce({
				error: null,
				value: {
					upload_url: "https://s3.amazonaws.com/test",
					file_key: "files/exact.txt",
					expires_at: "2025-12-23T10:00:00Z",
					max_size_bytes: 100,
				},
			});

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
			});

			const result = await uploadFile(mockApi, attachment);

			expect(result.error).toBeNull();
			expect(mockFetch).toHaveBeenCalled();
		});

		test("rejects upload when file size exceeds max_size_bytes", async () => {
			const buffer = Buffer.alloc(20 * 1024 * 1024); // 20MB
			const attachment = new FileAttachment(buffer, { filename: "large.bin" });

			mockApi.invoke.mockResolvedValueOnce({
				error: null,
				value: {
					upload_url: "https://s3.amazonaws.com/test",
					file_key: "files/large.bin",
					expires_at: "2025-12-23T10:00:00Z",
					max_size_bytes: 10 * 1024 * 1024, // 10MB limit
				},
			});

			const result = await uploadFile(mockApi, attachment);

			expect(result.error).not.toBeNull();
			expect(result.error?.message).toContain("exceeds maximum");
			expect(mockFetch).not.toHaveBeenCalled();
		});
	});

	describe("S3 upload", () => {
		test("makes PUT request to presigned URL", async () => {
			const blob = new Blob(["content"]);
			const attachment = new FileAttachment(blob, { filename: "test.txt" });

			const uploadUrl = "https://s3.amazonaws.com/bucket/key?signature=xyz";

			mockApi.invoke.mockResolvedValueOnce({
				error: null,
				value: {
					upload_url: uploadUrl,
					file_key: "files/test.txt",
					expires_at: "2025-12-23T10:00:00Z",
					max_size_bytes: 10485760,
				},
			});

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
			});

			await uploadFile(mockApi, attachment);

			expect(mockFetch).toHaveBeenCalledWith(
				uploadUrl,
				expect.objectContaining({
					method: "PUT",
				}),
			);
		});

		test("sets Content-Type header correctly", async () => {
			const blob = new Blob(["content"], { type: "image/jpeg" });
			const attachment = new FileAttachment(blob, { filename: "photo.jpg" });

			mockApi.invoke.mockResolvedValueOnce({
				error: null,
				value: {
					upload_url: "https://s3.amazonaws.com/test",
					file_key: "files/photo.jpg",
					expires_at: "2025-12-23T10:00:00Z",
					max_size_bytes: 10485760,
				},
			});

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
			});

			await uploadFile(mockApi, attachment);

			expect(mockFetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					headers: expect.objectContaining({
						"Content-Type": "image/jpeg",
					}),
				}),
			);
		});

		test("uploads Blob source directly as body", async () => {
			const blob = new Blob(["test content"]);
			const attachment = new FileAttachment(blob, { filename: "test.txt" });

			mockApi.invoke.mockResolvedValueOnce({
				error: null,
				value: {
					upload_url: "https://s3.amazonaws.com/test",
					file_key: "files/test.txt",
					expires_at: "2025-12-23T10:00:00Z",
					max_size_bytes: 10485760,
				},
			});

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
			});

			await uploadFile(mockApi, attachment);

			expect(mockFetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					body: blob,
				}),
			);
		});

		test("converts Buffer to Blob for upload", async () => {
			const buffer = Buffer.from("buffer content");
			const attachment = new FileAttachment(buffer, { filename: "test.bin" });

			mockApi.invoke.mockResolvedValueOnce({
				error: null,
				value: {
					upload_url: "https://s3.amazonaws.com/test",
					file_key: "files/test.bin",
					expires_at: "2025-12-23T10:00:00Z",
					max_size_bytes: 10485760,
				},
			});

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
			});

			await uploadFile(mockApi, attachment);

			expect(mockFetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					body: expect.any(Blob),
				}),
			);
		});

		test.each([
			[400, "Bad Request"],
			[403, "Forbidden"],
			[404, "Not Found"],
			[500, "Internal Server Error"],
			[503, "Service Unavailable"],
		])("returns error on S3 %i status code", async (status, statusText) => {
			const blob = new Blob(["content"]);
			const attachment = new FileAttachment(blob, { filename: "test.txt" });

			mockApi.invoke.mockResolvedValueOnce({
				error: null,
				value: {
					upload_url: "https://s3.amazonaws.com/test",
					file_key: "files/test.txt",
					expires_at: "2025-12-23T10:00:00Z",
					max_size_bytes: 10485760,
				},
			});

			mockFetch.mockResolvedValueOnce({
				ok: false,
				status,
				statusText,
			});

			const result = await uploadFile(mockApi, attachment);

			expect(result.error).not.toBeNull();
			expect(result.error?.message).toContain(status.toString());
		});
	});

	describe("content type detection", () => {
		test("uses explicit contentType option when provided", async () => {
			const blob = new Blob(["content"]);
			const attachment = new FileAttachment(blob, {
				filename: "data.bin",
				contentType: "application/x-custom",
			});

			mockApi.invoke.mockResolvedValueOnce({
				error: null,
				value: {
					upload_url: "https://s3.amazonaws.com/test",
					file_key: "files/data.bin",
					expires_at: "2025-12-23T10:00:00Z",
					max_size_bytes: 10485760,
				},
			});

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
			});

			await uploadFile(mockApi, attachment);

			expect(mockApi.invoke).toHaveBeenCalledWith(
				GenerateUploadUrlEndpoint,
				expect.objectContaining({
					content_type: "application/x-custom",
				}),
			);
		});

		test("uses Blob.type when available and no override", async () => {
			const blob = new Blob(["content"], { type: "text/html" });
			const attachment = new FileAttachment(blob, { filename: "page.html" });

			mockApi.invoke.mockResolvedValueOnce({
				error: null,
				value: {
					upload_url: "https://s3.amazonaws.com/test",
					file_key: "files/page.html",
					expires_at: "2025-12-23T10:00:00Z",
					max_size_bytes: 10485760,
				},
			});

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
			});

			await uploadFile(mockApi, attachment);

			expect(mockApi.invoke).toHaveBeenCalledWith(
				GenerateUploadUrlEndpoint,
				expect.objectContaining({
					content_type: "text/html",
				}),
			);
		});

		test("defaults to application/octet-stream for files without extension", async () => {
			const buffer = Buffer.from("data");
			const attachment = new FileAttachment(buffer, { filename: "README" });

			mockApi.invoke.mockResolvedValueOnce({
				error: null,
				value: {
					upload_url: "https://s3.amazonaws.com/test",
					file_key: "files/README",
					expires_at: "2025-12-23T10:00:00Z",
					max_size_bytes: 10485760,
				},
			});

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
			});

			await uploadFile(mockApi, attachment);

			expect(mockApi.invoke).toHaveBeenCalledWith(
				GenerateUploadUrlEndpoint,
				expect.objectContaining({
					content_type: "application/octet-stream",
				}),
			);
		});

		test("defaults to application/octet-stream when Blob.type is empty", async () => {
			const blob = new Blob(["content"], { type: "" });
			const attachment = new FileAttachment(blob, { filename: "data" });

			mockApi.invoke.mockResolvedValueOnce({
				error: null,
				value: {
					upload_url: "https://s3.amazonaws.com/test",
					file_key: "files/data",
					expires_at: "2025-12-23T10:00:00Z",
					max_size_bytes: 10485760,
				},
			});

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
			});

			await uploadFile(mockApi, attachment);

			expect(mockApi.invoke).toHaveBeenCalledWith(
				GenerateUploadUrlEndpoint,
				expect.objectContaining({
					content_type: "application/octet-stream",
				}),
			);
		});
	});

	describe("error handling", () => {
		test("returns FileUploadError when S3 upload fails", async () => {
			const blob = new Blob(["content"]);
			const attachment = new FileAttachment(blob, { filename: "failed.txt" });

			mockApi.invoke.mockResolvedValueOnce({
				error: null,
				value: {
					upload_url: "https://s3.amazonaws.com/test",
					file_key: "files/failed.txt",
					expires_at: "2025-12-23T10:00:00Z",
					max_size_bytes: 10485760,
				},
			});

			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 500,
			});

			const result = await uploadFile(mockApi, attachment);

			expect(result.error).not.toBeNull();
			expect(result.error?.message).toContain("S3 upload failed");
			expect(result.error?.message).toContain("500");
		});

		test("handles network errors during S3 upload", async () => {
			const blob = new Blob(["content"]);
			const attachment = new FileAttachment(blob, { filename: "error.txt" });

			mockApi.invoke.mockResolvedValueOnce({
				error: null,
				value: {
					upload_url: "https://s3.amazonaws.com/test",
					file_key: "files/error.txt",
					expires_at: "2025-12-23T10:00:00Z",
					max_size_bytes: 10485760,
				},
			});

			mockFetch.mockRejectedValueOnce(new Error("Network error"));

			const result = await uploadFile(mockApi, attachment);

			expect(result.error).not.toBeNull();
			expect(result.error?.message).toContain("Failed to upload file");
		});

		test("includes size information in error when file too large", async () => {
			const blob = new Blob(["x".repeat(200)]);
			const attachment = new FileAttachment(blob, {
				filename: "important.pdf",
			});

			mockApi.invoke.mockResolvedValueOnce({
				error: null,
				value: {
					upload_url: "https://s3.amazonaws.com/test",
					file_key: "files/important.pdf",
					expires_at: "2025-12-23T10:00:00Z",
					max_size_bytes: 100,
				},
			});

			const result = await uploadFile(mockApi, attachment);

			expect(result.error).not.toBeNull();
			expect(result.error?.message).toContain("exceeds maximum");
			expect(result.error?.message).toContain("200");
			expect(result.error?.message).toContain("100");
		});
	});

	describe("edge cases", () => {
		test("handles empty files", async () => {
			const blob = new Blob([], { type: "text/plain" });
			const attachment = new FileAttachment(blob, { filename: "empty.txt" });

			mockApi.invoke.mockResolvedValueOnce({
				error: null,
				value: {
					upload_url: "https://s3.amazonaws.com/test",
					file_key: "files/empty.txt",
					expires_at: "2025-12-23T10:00:00Z",
					max_size_bytes: 10485760,
				},
			});

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
			});

			const result = await uploadFile(mockApi, attachment);

			expect(result.error).toBeNull();
			expect(result.value).toBe("files/empty.txt");
		});

		test("handles files without extensions", async () => {
			const buffer = Buffer.from("data");
			const attachment = new FileAttachment(buffer, { filename: "README" });

			mockApi.invoke.mockResolvedValueOnce({
				error: null,
				value: {
					upload_url: "https://s3.amazonaws.com/test",
					file_key: "files/README",
					expires_at: "2025-12-23T10:00:00Z",
					max_size_bytes: 10485760,
				},
			});

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
			});

			const result = await uploadFile(mockApi, attachment);

			expect(result.error).toBeNull();
		});
	});
});
