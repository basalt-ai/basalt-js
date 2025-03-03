import type { IBasaltSDK, IPromptSDK } from './resources'
import { IMonitorSDK } from './resources/monitor/monitor.types';

/**
 * The `BasaltSDK` class implements the `IBasaltSDK` interface.
 * It serves as the main entry point for interacting with the Basalt SDK.
 */
export default class BasaltSDK implements IBasaltSDK {
	constructor(
		public readonly prompt: IPromptSDK,
		public readonly monitor: IMonitorSDK
	) {}
}
