import BasaltSDK from './basalt-sdk'
import type { IBasaltSDK, ICache, LogLevel } from './resources/contract'
import DatasetSDK from './sdk/dataset-sdk'
import PromptSDK from './sdk/prompt-sdk'
import Api from './utils/api'
import Logger from './utils/logger'
import MemoryCache from './utils/memorycache'
import Networker from './utils/networker'

/**
 * BasaltSDK is the entry point for interacting with the Basalt.
 * It provides access to various functionalities of the SDK through a simplified interface.
 *
 * @example
 * ```typescript
 * const basalt = new BasaltSDK({ apiKey: 'your-api-key' });
 *
 * // Use the prompt property to interact with your Basalt prompts
 * basalt.prompt.get('my-prompt');
 * ```
 */
export default class BasaltSDKFacade implements IBasaltSDK {
	private static readonly _cache: ICache = new MemoryCache()
	private readonly _basaltSdk: IBasaltSDK

	constructor(opts: { apiKey: string, logLevel?: LogLevel }) {
		const networker = new Networker()

		const api = new Api(
			new URL(__PUBLIC_API_URL__),
			networker,
			opts.apiKey,
			__SDK_VERSION__,
			__SDK_TARGET__,
		)

		const queryCache = new MemoryCache()

		this._basaltSdk = new BasaltSDK(
			new PromptSDK(
				api,
				queryCache,
				BasaltSDKFacade._cache,
				new Logger(opts.logLevel ?? 'warning'),
			),
			new DatasetSDK(
				api,
				queryCache,
				BasaltSDKFacade._cache,
				new Logger(opts.logLevel ?? 'warning'),
			),
		)
	}

	public get prompt() {
		return this._basaltSdk.prompt
	}

	public get dataset() {
		return this._basaltSdk.dataset
	}
}
