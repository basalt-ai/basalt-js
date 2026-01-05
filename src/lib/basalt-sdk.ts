import type { IBasaltSDK, IPromptSDK } from "./resources";
import type { IDatasetSDK } from "./resources/dataset/dataset.types";
import type { IMonitorSDK } from "./resources/monitor/monitor.types";

/**
 * The `BasaltSDK` class implements the `IBasaltSDK` interface.
 * It serves as the main entry point for interacting with the Basalt SDK.
 */
export default class BasaltSDK implements IBasaltSDK {
	constructor(
		public readonly prompt: IPromptSDK,
		public readonly monitor: IMonitorSDK,
		public readonly dataset: IDatasetSDK,
	) {}

	/**
	 * Shutdown SDK - delegate to facade
	 * This is a no-op in the internal SDK, facade handles actual shutdown
	 */
	async shutdown(): Promise<void> {
		// No-op - facade handles telemetry shutdown
	}
}
