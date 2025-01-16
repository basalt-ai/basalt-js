import type { IBasaltSDK, IPromptSDK } from './contract'

/**
 * The `BasaltSDK` class implements the `IBasaltSDK` interface.
 * It serves as the main entry point for interacting with the Basalt SDK.
 */
export default class BasaltSDK implements IBasaltSDK {
	constructor(
		public readonly prompt: IPromptSDK
	) {}
}
