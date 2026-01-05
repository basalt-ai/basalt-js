import BasaltSDK from './basalt-sdk'
import type { BasaltConfig, IBasaltSDK, ICache } from './resources/contract'
import DatasetSDK from './sdk/dataset-sdk'
import MonitorSDK from './sdk/monitor-sdk'
import PromptSDK from './sdk/prompt-sdk'
import { TelemetryManager } from './telemetry/manager'
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
	private readonly _telemetryManager?: TelemetryManager

	constructor(config: BasaltConfig) {
		const logger = new Logger(config.logLevel ?? 'warning')

		// Initialize telemetry first (if enabled)
		if (config.telemetry?.enabled !== false) {
			try {
				this._telemetryManager = TelemetryManager.initialize({
					apiKey: config.telemetry?.apiKey ?? config.apiKey,
					endpoint: config.telemetry?.endpoint
						?? process.env['BASALT_OTEL_EXPORTER_OTLP_ENDPOINT']
						?? 'localhost:4317',
					insecure: config.telemetry?.insecure ?? false,
					metadata: config.telemetry?.metadata,
					serviceName: config.telemetry?.serviceName ?? 'basalt-sdk-app',
				})
				logger.info('Telemetry initialized successfully')
			} catch (error) {
				logger.warn(
					'Failed to initialize telemetry. SDK will continue without tracing.',
					error instanceof Error ? error.message : String(error),
				)
			}
		}

		// Existing SDK initialization
		const networker = new Networker()

		const api = new Api(
			new URL(__PUBLIC_API_URL__),
			networker,
			config.apiKey,
			__SDK_VERSION__,
			__SDK_TARGET__,
		)

		const queryCache = new MemoryCache()

		this._basaltSdk = new BasaltSDK(
			new PromptSDK(
				api,
				queryCache,
				BasaltSDKFacade._cache,
				logger,
			),
			new MonitorSDK(
				api,
				logger,
			),
			new DatasetSDK(
				api,
				queryCache,
				BasaltSDKFacade._cache,
				logger,
			),
		)
	}

	/**
	 * Shutdown the SDK and cleanup resources
	 * Flushes telemetry before shutting down
	 */
	async shutdown(): Promise<void> {
		try {
			if (this._telemetryManager) {
				await this._telemetryManager.forceFlush()
				await this._telemetryManager.shutdown()
			}
		} catch (error) {
			console.warn('Error during SDK shutdown:', error)
		}
	}

	public get prompt() {
		return this._basaltSdk.prompt
	}

	public get monitor() {
		return this._basaltSdk.monitor
	}

	public get dataset() {
		return this._basaltSdk.dataset
	}
}
