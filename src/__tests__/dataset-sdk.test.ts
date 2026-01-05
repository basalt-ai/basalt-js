import {
	CreateDatasetItemEndpoint,
	GetDatasetEndpoint,
	ListDatasetsEndpoint,
} from "../lib/endpoints";
import { FileAttachment } from "../lib/resources/dataset/file-attachment.types";
import DatasetSDK from "../lib/sdk/dataset-sdk";
import { uploadFile } from "../lib/utils/file-upload";

// Mock uploadFile utility
jest.mock("../lib/utils/file-upload", () => ({
	uploadFile: jest.fn(),
}));

const mockUploadFile = uploadFile as jest.Mock;

const mockApi = {
	invoke: jest.fn(),
};

const mockQueryCache = {
	get: jest.fn(),
	set: jest.fn(),
};

const mockFallbackCache = {
	get: jest.fn(),
	set: jest.fn(),
};

const mockLogger = {
	warn: jest.fn(),
	info: jest.fn(),
	error: jest.fn(),
};

const datasetSDK = new DatasetSDK(
	mockApi,
	mockQueryCache,
	mockFallbackCache,
	mockLogger,
);

describe("DatasetSDK", () => {
	beforeEach(() => {
		mockApi.invoke.mockReset();
		mockQueryCache.get.mockReset();
		mockQueryCache.set.mockReset();
		mockFallbackCache.get.mockReset();
		mockFallbackCache.set.mockReset();
		mockLogger.warn.mockReset();
		mockUploadFile.mockReset();
	});

	describe("list()", () => {
		test("calls ListDatasetsEndpoint", async () => {
			mockApi.invoke.mockResolvedValueOnce({
				error: null,
				value: {
					datasets: [
						{ slug: "dataset-1", name: "Dataset 1" },
						{ slug: "dataset-2", name: "Dataset 2" },
					],
				},
			});

			await datasetSDK.list();

			expect(mockApi.invoke).toHaveBeenCalledWith(ListDatasetsEndpoint);
		});

		test("returns datasets array from response", async () => {
			const datasets = [
				{ slug: "dataset-1", name: "Dataset 1" },
				{ slug: "dataset-2", name: "Dataset 2" },
			];

			mockApi.invoke.mockResolvedValueOnce({
				error: null,
				value: { datasets },
			});

			const result = await datasetSDK.list();

			expect(result.error).toBeNull();
			expect(result.value).toEqual(datasets);
		});

		test("logs warning when response includes warning", async () => {
			mockApi.invoke.mockResolvedValueOnce({
				error: null,
				value: {
					warning: "Some datasets are deprecated",
					datasets: [],
				},
			});

			await datasetSDK.list();

			expect(mockLogger.warn).toHaveBeenCalledWith(
				expect.stringContaining("Some datasets are deprecated"),
			);
		});

		test("forwards API errors", async () => {
			mockApi.invoke.mockResolvedValueOnce({
				error: { message: "API error" },
				value: null,
			});

			const result = await datasetSDK.list();

			expect(result.error).not.toBeNull();
			expect(result.error?.message).toBe("API error");
		});
	});

	describe("get()", () => {
		test("calls GetDatasetEndpoint with slug", async () => {
			mockApi.invoke.mockResolvedValueOnce({
				error: null,
				value: {
					dataset: {
						slug: "test-dataset",
						name: "Test Dataset",
					},
				},
			});

			await datasetSDK.get("test-dataset");

			expect(mockApi.invoke).toHaveBeenCalledWith(GetDatasetEndpoint, {
				slug: "test-dataset",
			});
		});

		test("caches result in queryCache and fallbackCache", async () => {
			const dataset = {
				slug: "test-dataset",
				name: "Test Dataset",
			};

			mockApi.invoke.mockResolvedValueOnce({
				error: null,
				value: { dataset },
			});

			await datasetSDK.get("test-dataset");

			expect(mockQueryCache.set).toHaveBeenCalledWith(
				"test-dataset",
				dataset,
				expect.any(Number),
			);
			expect(mockFallbackCache.set).toHaveBeenCalledWith(
				"test-dataset",
				dataset,
				Infinity,
			);
		});

		test("returns cached result when available", async () => {
			const cachedDataset = {
				slug: "cached-dataset",
				name: "Cached Dataset",
			};

			mockQueryCache.get.mockReturnValueOnce(cachedDataset);

			const result = await datasetSDK.get("cached-dataset");

			expect(result.value).toEqual(cachedDataset);
			expect(mockApi.invoke).not.toHaveBeenCalled();
		});

		test("uses fallback cache on API failure", async () => {
			const fallbackDataset = {
				slug: "test-dataset",
				name: "Fallback Dataset",
			};

			mockApi.invoke.mockResolvedValueOnce({
				error: { message: "API error" },
				value: null,
			});

			mockFallbackCache.get.mockReturnValueOnce(fallbackDataset);

			const result = await datasetSDK.get("test-dataset");

			expect(result.value).toEqual(fallbackDataset);
			expect(mockLogger.warn).toHaveBeenCalled();
		});
	});

	describe("addRow() without files", () => {
		test("calls CreateDatasetItemEndpoint with string values", async () => {
			mockApi.invoke.mockResolvedValueOnce({
				error: null,
				value: {
					datasetRow: {
						name: "Test Row",
						values: { input: "hello", output: "world" },
					},
				},
			});

			await datasetSDK.addRow("test-dataset", {
				values: { input: "hello", output: "world" },
			});

			expect(mockApi.invoke).toHaveBeenCalledWith(
				CreateDatasetItemEndpoint,
				expect.objectContaining({
					slug: "test-dataset",
					values: { input: "hello", output: "world" },
				}),
			);
		});

		test("does not call uploadFile when no FileAttachment present", async () => {
			mockApi.invoke.mockResolvedValueOnce({
				error: null,
				value: {
					datasetRow: {
						values: { input: "test" },
					},
				},
			});

			await datasetSDK.addRow("test-dataset", {
				values: { input: "test" },
			});

			expect(mockUploadFile).not.toHaveBeenCalled();
		});

		test("passes name, idealOutput, metadata correctly", async () => {
			mockApi.invoke.mockResolvedValueOnce({
				error: null,
				value: {
					datasetRow: {
						name: "Test Item",
						values: {},
					},
				},
			});

			await datasetSDK.addRow("test-dataset", {
				name: "Test Item",
				values: { input: "test" },
				idealOutput: "expected",
				metadata: { source: "manual" },
				isPlayground: false,
			});

			expect(mockApi.invoke).toHaveBeenCalledWith(
				CreateDatasetItemEndpoint,
				expect.objectContaining({
					name: "Test Item",
					idealOutput: "expected",
					metadata: { source: "manual" },
					isPlayground: false,
				}),
			);
		});
	});

	describe("addRow() with files", () => {
		test("detects FileAttachment in values object", async () => {
			const fileAttachment = new FileAttachment(Buffer.from("test"), {
				filename: "test.txt",
			});

			mockUploadFile.mockResolvedValueOnce({
				error: null,
				value: "files/uploaded-key-123",
			});

			mockApi.invoke.mockResolvedValueOnce({
				error: null,
				value: {
					datasetRow: {
						values: { file: "files/uploaded-key-123" },
					},
				},
			});

			await datasetSDK.addRow("test-dataset", {
				values: { file: fileAttachment },
			});

			expect(mockUploadFile).toHaveBeenCalled();
		});

		test("calls uploadFile for each FileAttachment", async () => {
			const file1 = new FileAttachment(Buffer.from("file1"), {
				filename: "file1.txt",
			});
			const file2 = new FileAttachment(Buffer.from("file2"), {
				filename: "file2.txt",
			});

			mockUploadFile
				.mockResolvedValueOnce({ error: null, value: "files/key-1" })
				.mockResolvedValueOnce({ error: null, value: "files/key-2" });

			mockApi.invoke.mockResolvedValueOnce({
				error: null,
				value: {
					datasetRow: {
						values: { file1: "files/key-1", file2: "files/key-2" },
					},
				},
			});

			await datasetSDK.addRow("test-dataset", {
				values: { file1, file2 },
			});

			expect(mockUploadFile).toHaveBeenCalledTimes(2);
			expect(mockUploadFile).toHaveBeenCalledWith(mockApi, file1);
			expect(mockUploadFile).toHaveBeenCalledWith(mockApi, file2);
		});

		test("replaces FileAttachment with file_key in values", async () => {
			const fileAttachment = new FileAttachment(Buffer.from("test"), {
				filename: "test.txt",
			});

			mockUploadFile.mockResolvedValueOnce({
				error: null,
				value: "files/uploaded-key-123",
			});

			mockApi.invoke.mockResolvedValueOnce({
				error: null,
				value: {
					datasetRow: {
						values: { file: "files/uploaded-key-123" },
					},
				},
			});

			await datasetSDK.addRow("test-dataset", {
				values: { file: fileAttachment },
			});

			expect(mockApi.invoke).toHaveBeenCalledWith(
				CreateDatasetItemEndpoint,
				expect.objectContaining({
					values: { file: "files/uploaded-key-123" },
				}),
			);
		});

		test("preserves string values unchanged", async () => {
			const fileAttachment = new FileAttachment(Buffer.from("test"), {
				filename: "test.txt",
			});

			mockUploadFile.mockResolvedValueOnce({
				error: null,
				value: "files/uploaded-key",
			});

			mockApi.invoke.mockResolvedValueOnce({
				error: null,
				value: {
					datasetRow: {
						values: { text: "hello", file: "files/uploaded-key" },
					},
				},
			});

			await datasetSDK.addRow("test-dataset", {
				values: { text: "hello", file: fileAttachment },
			});

			expect(mockApi.invoke).toHaveBeenCalledWith(
				CreateDatasetItemEndpoint,
				expect.objectContaining({
					values: { text: "hello", file: "files/uploaded-key" },
				}),
			);
		});

		test("handles mixed values (files and strings)", async () => {
			const file1 = new FileAttachment(Buffer.from("data"), {
				filename: "file.txt",
			});

			mockUploadFile.mockResolvedValueOnce({
				error: null,
				value: "files/key-1",
			});

			mockApi.invoke.mockResolvedValueOnce({
				error: null,
				value: {
					datasetRow: {
						values: {
							text1: "value1",
							file: "files/key-1",
							text2: "value2",
						},
					},
				},
			});

			await datasetSDK.addRow("test-dataset", {
				values: {
					text1: "value1",
					file: file1,
					text2: "value2",
				},
			});

			expect(mockApi.invoke).toHaveBeenCalledWith(
				CreateDatasetItemEndpoint,
				expect.objectContaining({
					values: {
						text1: "value1",
						file: "files/key-1",
						text2: "value2",
					},
				}),
			);
		});

		test("passes all options correctly with file uploads", async () => {
			const fileAttachment = new FileAttachment(Buffer.from("data"), {
				filename: "test.txt",
			});

			mockUploadFile.mockResolvedValueOnce({
				error: null,
				value: "files/key",
			});

			mockApi.invoke.mockResolvedValueOnce({
				error: null,
				value: {
					datasetRow: {
						name: "Test",
						values: { file: "files/key" },
					},
				},
			});

			await datasetSDK.addRow("test-dataset", {
				name: "Test",
				values: { file: fileAttachment },
				idealOutput: "expected",
				metadata: { source: "upload" },
				isPlayground: true,
			});

			expect(mockApi.invoke).toHaveBeenCalledWith(
				CreateDatasetItemEndpoint,
				expect.objectContaining({
					slug: "test-dataset",
					name: "Test",
					values: { file: "files/key" },
					idealOutput: "expected",
					metadata: { source: "upload" },
					isPlayground: true,
				}),
			);
		});
	});

	describe("file upload error handling", () => {
		test("returns error when uploadFile fails", async () => {
			const fileAttachment = new FileAttachment(Buffer.from("test"), {
				filename: "test.txt",
			});

			mockUploadFile.mockResolvedValueOnce({
				error: { message: "Upload failed" },
				value: null,
			});

			const result = await datasetSDK.addRow("test-dataset", {
				values: { file: fileAttachment },
			});

			expect(result.error).not.toBeNull();
		});

		test("includes field name in error message", async () => {
			const fileAttachment = new FileAttachment(Buffer.from("test"), {
				filename: "test.txt",
			});

			mockUploadFile.mockResolvedValueOnce({
				error: { message: "Upload failed" },
				value: null,
			});

			const result = await datasetSDK.addRow("test-dataset", {
				values: { profilePhoto: fileAttachment },
			});

			expect(result.error).not.toBeNull();
			expect(result.error?.message).toContain("profilePhoto");
		});

		test("stops processing on first upload failure", async () => {
			const file1 = new FileAttachment(Buffer.from("file1"), {
				filename: "file1.txt",
			});
			const file2 = new FileAttachment(Buffer.from("file2"), {
				filename: "file2.txt",
			});

			// First upload fails
			mockUploadFile.mockResolvedValueOnce({
				error: { message: "Upload failed" },
				value: null,
			});

			const result = await datasetSDK.addRow("test-dataset", {
				values: { file1, file2 },
			});

			expect(result.error).not.toBeNull();
			// Should only call uploadFile once (stops on first error)
			expect(mockUploadFile).toHaveBeenCalledTimes(1);
		});

		test("does not call CreateDatasetItemEndpoint on upload failure", async () => {
			const fileAttachment = new FileAttachment(Buffer.from("test"), {
				filename: "test.txt",
			});

			mockUploadFile.mockResolvedValueOnce({
				error: { message: "Upload failed" },
				value: null,
			});

			await datasetSDK.addRow("test-dataset", {
				values: { file: fileAttachment },
			});

			expect(mockApi.invoke).not.toHaveBeenCalled();
		});
	});
});
