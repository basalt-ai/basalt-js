import CreateExperimentEndpoint from "../lib/endpoints/monitor/create-experiment";
import { Experiment } from "../lib/objects/experiment";
import MonitorSDK from "../lib/sdk/monitor-sdk";

const mockApi = {
	invoke: jest.fn(),
};

const mockLogger = {
	warn: jest.fn(),
	info: jest.fn(),
	error: jest.fn(),
};

const monitorSDK = new MonitorSDK(mockApi, mockLogger);

describe("MonitorSDK", () => {
	beforeEach(() => {
		mockApi.invoke.mockReset();
		mockLogger.warn.mockReset();
		mockLogger.info.mockReset();
		mockLogger.error.mockReset();
	});

	describe("createExperiment()", () => {
		test("calls CreateExperimentEndpoint without traceRequestSpan option", async () => {
			const experimentData = {
				id: "exp-123",
				featureSlug: "test-feature",
				name: "Test Experiment",
				createdAt: new Date(),
			};

			mockApi.invoke.mockResolvedValueOnce({
				error: null,
				value: { experiment: new Experiment(experimentData) },
			});

			const result = await monitorSDK.createExperiment("test-feature", {
				name: "Test Experiment",
			});

			expect(result.error).toBeNull();
			expect(result.value).toBeInstanceOf(Experiment);
			expect(result.value.id).toBe("exp-123");
			expect(mockApi.invoke).toHaveBeenCalledTimes(1);
		});

		test("handles errors from API", async () => {
			const error = {
				message: "Failed to create experiment",
			};

			mockApi.invoke.mockResolvedValueOnce({
				error,
				value: null,
			});

			const result = await monitorSDK.createExperiment("test-feature", {
				name: "Test Experiment",
			});

			expect(result.error).toMatchObject(error);
			expect(result.value).toBeNull();
			expect(mockApi.invoke).toHaveBeenCalledTimes(1);
		});
	});
});
