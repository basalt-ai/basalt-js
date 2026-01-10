import fixtures from "../__fixtures__/generate-upload-url.json";
import GenerateUploadUrlEndpoint from "../lib/endpoints/files/generate-upload-url";

describe("GenerateUploadUrlEndpoint", () => {
	describe("prepareRequest", () => {
		test("path is /files/generate-upload-url and method is post", () => {
			const result = GenerateUploadUrlEndpoint.prepareRequest({
				filename: "test.png",
				content_type: "image/png",
			});

			expect(result.path).toBe("/files/generate-upload-url");
			expect(result.method).toBe("post");
		});

		test("request body includes fileName and contentType in camelCase", () => {
			const params = {
				filename: "document.pdf",
				content_type: "application/pdf",
			};

			const result = GenerateUploadUrlEndpoint.prepareRequest(params);

			expect(result.body).toMatch(
				JSON.stringify({
					fileName: params.filename,
					contentType: params.content_type,
				}),
			);
		});

		test("request body includes sizeBytes when provided", () => {
			const params = {
				filename: "image.jpg",
				content_type: "image/jpeg",
				size_bytes: 1024000,
			};

			const result = GenerateUploadUrlEndpoint.prepareRequest(params);

			expect(result.body).toMatch(
				JSON.stringify({
					fileName: params.filename,
					contentType: params.content_type,
					sizeBytes: params.size_bytes,
				}),
			);
		});

		test("request body excludes sizeBytes when undefined", () => {
			const params = {
				filename: "file.txt",
				content_type: "text/plain",
			};

			const result = GenerateUploadUrlEndpoint.prepareRequest(params);
			const body = JSON.parse(result.body);

			expect(body).toHaveProperty("fileName");
			expect(body).toHaveProperty("contentType");
			expect(body.sizeBytes).toBeUndefined();
		});
	});

	describe("decodeResponse", () => {
		test("positively decodes valid response with all required fields", () => {
			const result = GenerateUploadUrlEndpoint.decodeResponse(
				fixtures.validResponse.body,
			);

			expect(result.error).toBeNull();
			expect(result.value).toMatchObject({
				upload_url: fixtures.validResponse.body.uploadUrl,
				file_key: fixtures.validResponse.body.fileKey,
				expires_at: fixtures.validResponse.body.expiresAt,
				max_size_bytes: fixtures.validResponse.body.maxSizeBytes,
			});
		});

		test("rejects response missing uploadUrl", () => {
			const body = {
				fileKey: "files/test",
				expiresAt: "2025-12-23T10:00:00Z",
				maxSizeBytes: 10485760,
			};

			const result = GenerateUploadUrlEndpoint.decodeResponse(body);

			expect(result.error).not.toBeNull();
			expect(result.error?.message).toContain("uploadUrl");
		});

		test("rejects response missing fileKey", () => {
			const body = {
				uploadUrl: "https://s3.amazonaws.com/test",
				expiresAt: "2025-12-23T10:00:00Z",
				maxSizeBytes: 10485760,
			};

			const result = GenerateUploadUrlEndpoint.decodeResponse(body);

			expect(result.error).not.toBeNull();
			expect(result.error?.message).toContain("fileKey");
		});

		test("rejects response missing expiresAt", () => {
			const body = {
				uploadUrl: "https://s3.amazonaws.com/test",
				fileKey: "files/test",
				maxSizeBytes: 10485760,
			};

			const result = GenerateUploadUrlEndpoint.decodeResponse(body);

			expect(result.error).not.toBeNull();
			expect(result.error?.message).toContain("expiresAt");
		});

		test("rejects response missing maxSizeBytes", () => {
			const body = {
				uploadUrl: "https://s3.amazonaws.com/test",
				fileKey: "files/test",
				expiresAt: "2025-12-23T10:00:00Z",
			};

			const result = GenerateUploadUrlEndpoint.decodeResponse(body);

			expect(result.error).not.toBeNull();
			expect(result.error?.message).toContain("maxSizeBytes");
		});

		test("rejects response with wrong type for uploadUrl", () => {
			const body = {
				uploadUrl: 123,
				fileKey: "files/test",
				expiresAt: "2025-12-23T10:00:00Z",
				maxSizeBytes: 10485760,
			};

			const result = GenerateUploadUrlEndpoint.decodeResponse(body);

			expect(result.error).not.toBeNull();
			expect(result.error?.message).toContain("uploadUrl");
		});

		test("rejects response with wrong type for fileKey", () => {
			const body = {
				uploadUrl: "https://s3.amazonaws.com/test",
				fileKey: 123,
				expiresAt: "2025-12-23T10:00:00Z",
				maxSizeBytes: 10485760,
			};

			const result = GenerateUploadUrlEndpoint.decodeResponse(body);

			expect(result.error).not.toBeNull();
			expect(result.error?.message).toContain("fileKey");
		});

		test("rejects response with wrong type for expiresAt", () => {
			const body = {
				uploadUrl: "https://s3.amazonaws.com/test",
				fileKey: "files/test",
				expiresAt: 12345,
				maxSizeBytes: 10485760,
			};

			const result = GenerateUploadUrlEndpoint.decodeResponse(body);

			expect(result.error).not.toBeNull();
			expect(result.error?.message).toContain("expiresAt");
		});

		test("rejects response with wrong type for maxSizeBytes", () => {
			const body = {
				uploadUrl: "https://s3.amazonaws.com/test",
				fileKey: "files/test",
				expiresAt: "2025-12-23T10:00:00Z",
				maxSizeBytes: "10485760",
			};

			const result = GenerateUploadUrlEndpoint.decodeResponse(body);

			expect(result.error).not.toBeNull();
			expect(result.error?.message).toContain("maxSizeBytes");
		});

		test.each([
			"some text - while the content should be json",
			null,
			undefined,
			[],
			100,
			true,
			fixtures.falsePositive.body,
		])("rejects invalid responses", (body) => {
			const result = GenerateUploadUrlEndpoint.decodeResponse(body);

			expect(result.error).not.toBeNull();
		});
	});
});
