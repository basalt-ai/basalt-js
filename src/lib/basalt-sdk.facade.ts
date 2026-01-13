/** biome-ignore-all lint/complexity/useLiteralKeys: <explanation> */
import BasaltSDK from "./basalt-sdk";
import type { InstrumentationConfig } from "./instrumentation";
import { instrument as instrumentProviders } from "./instrumentation";
import type { BasaltConfig, IBasaltSDK, ICache } from "./resources/contract";
import DatasetSDK from "./sdk/dataset-sdk";
import MonitorSDK from "./sdk/monitor-sdk";
import PromptSDK from "./sdk/prompt-sdk";
import { TelemetryManager } from "./telemetry/manager";
import type { SpanHandle, StartSpanHandle } from "./telemetry/span-handle";
import { observe, startObserve } from "./telemetry/telemetry";
import type { ObserveOptions, StartObserveOptions } from "./telemetry/types";
import Api from "./utils/api";
import Logger from "./utils/logger";
import MemoryCache from "./utils/memorycache";
import Networker from "./utils/networker";

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
	private static readonly _cache: ICache = new MemoryCache();
	private readonly _basaltSdk: IBasaltSDK;
	private readonly _telemetryManager?: TelemetryManager;

	constructor(config: BasaltConfig) {
		const logger = new Logger(config.logLevel ?? "warning");

		// Initialize telemetry first (if enabled)
		if (config.telemetry?.enabled !== false) {
			try {
				// Determine OTEL exporter endpoint with explicit priority:
				// 1. Explicit config.telemetry.endpoint (highest priority)
				// 2. BASALT_OTEL_EXPORTER_OTLP_ENDPOINT environment variable
				// 3. OTEL_EXPORTER_OTLP_ENDPOINT environment variable (standard OTEL)
				// 4. Default to 'https://grpc.otel.getbasalt.ai'
				let endpoint: string;
				let endpointSource: string;

				if (config.telemetry?.endpoint) {
					endpoint = config.telemetry.endpoint;
					endpointSource = "config";
				} else if (process.env["BASALT_OTEL_EXPORTER_OTLP_ENDPOINT"]) {
					endpoint = process.env["BASALT_OTEL_EXPORTER_OTLP_ENDPOINT"];
					endpointSource = "BASALT_OTEL_EXPORTER_OTLP_ENDPOINT env var";
				} else if (process.env["OTEL_EXPORTER_OTLP_ENDPOINT"]) {
					endpoint = process.env["OTEL_EXPORTER_OTLP_ENDPOINT"];
					endpointSource = "OTEL_EXPORTER_OTLP_ENDPOINT env var";
				} else {
					endpoint = "https://grpc.otel.getbasalt.ai";
					endpointSource = "default";
				}

				this._telemetryManager = TelemetryManager.initialize({
					apiKey: config.telemetry?.apiKey ?? config.apiKey,
					endpoint,
					insecure: config.telemetry?.insecure ?? false,
					metadata: config.telemetry?.metadata,
					serviceName: config.telemetry?.serviceName ?? "basalt-sdk-app",
				});
				logger.info(
					`Telemetry initialized successfully (OTEL exporter endpoint: ${endpoint} from ${endpointSource})`,
				);
			} catch (error) {
				logger.warn(
					"Failed to initialize telemetry. SDK will continue without tracing.",
					error instanceof Error ? error.message : String(error),
				);
			}
		}

		// Existing SDK initialization
		const networker = new Networker();

		const api = new Api(
			new URL(__PUBLIC_API_URL__),
			networker,
			config.apiKey,
			__SDK_VERSION__,
			__SDK_TARGET__,
		);

		const queryCache = new MemoryCache();

		this._basaltSdk = new BasaltSDK(
			new PromptSDK(api, queryCache, BasaltSDKFacade._cache, logger),
			new MonitorSDK(api, logger),
			new DatasetSDK(api, queryCache, BasaltSDKFacade._cache, logger),
		);
	}

	/**
	 * Shutdown the SDK and cleanup resources
	 * Flushes telemetry before shutting down
	 */
	async shutdown(): Promise<void> {
		try {
			if (this._telemetryManager) {
				await this._telemetryManager.forceFlush();
				await this._telemetryManager.shutdown();
			}
		} catch (error) {
			console.warn("Error during SDK shutdown:", error);
		}
	}

	/**
	 * Execute a function within an observation span that automatically wraps all nested operations
	 *
	 * This creates an active span marked with Basalt metadata that becomes the parent for all
	 * child operations. The span allows setting experiment, identity, and evaluation configuration.
	 *
	 * Use this at operation entry points (request handlers, background jobs, CLI commands)
	 * to automatically wrap all nested SDK and manual span operations in a single parent span.
	 *
	 * @param options - Configuration for the observation span
	 * @param fn - Async function to execute within the observation span context
	 * @returns Result of the function execution
	 *
	 * @example
	 * ```typescript
	 * await basalt.observe(
	 *   { name: 'process-user-request' },
	 *   async (span) => {
	 *     span.setExperiment('recommendation-v2')
	 *       .setIdentity({ userId: '123', organizationId: 'acme' });
	 *
	 *     // All operations automatically become child spans
	 *     await basalt.prompt.get({ slug: 'greeting' });
	 *     const result = await processData();
	 *     return result;
	 *   }
	 * );
	 * ```
	 */
	public async observe<T>(
		options: ObserveOptions,
		fn: (span: SpanHandle) => Promise<T>,
	): Promise<T> {
		return observe(options, fn);
	}

	/**
	 * Start a root observation span with experiment and identity context
	 * Returns a handle that must be manually ended
	 *
	 * @param options Root observation options including experiment and identity (featureSlug is required)
	 * @returns StartSpanHandle that must be manually ended
	 *
	 * @example
	 * ```typescript
	 * const span = basalt.startObserve({
	 *   name: 'my-root-operation',
	 *   featureSlug: 'my-feature',
	 *   experiment: { id: 'exp-123' },
	 *   identity: { userId: 'user-1', organizationId: 'org-1' }
	 * })
	 * try {
	 *   // ... perform work
	 * } finally {
	 *   span.end()
	 * }
	 * ```
	 */
	public startObserve(options: StartObserveOptions): StartSpanHandle {
		return startObserve(options);
	}

	/**
	 * Enable auto-instrumentation for GenAI providers
	 *
	 * Automatically creates spans for LLM API calls that inherit basalt_trace
	 * attributes when inside a Basalt observation context.
	 *
	 * Uses existing OpenTelemetry instrumentation libraries:
	 * - OpenAI: @opentelemetry/instrumentation-openai
	 * - Anthropic: @traceloop/instrumentation-anthropic
	 * - AWS Bedrock: @traceloop/instrumentation-bedrock
	 *
	 * @param config Provider-specific configuration
	 * @example
	 * ```typescript
	 * // Enable all providers with defaults
	 * basalt.instrument({
	 *   openai: true,
	 *   anthropic: true,
	 *   bedrock: true
	 * })
	 *
	 * // Enable with privacy mode (no message content)
	 * basalt.instrument({
	 *   openai: true,
	 *   anthropic: { captureContent: false }
	 * })
	 * ```
	 */
	public instrument(config: InstrumentationConfig): void {
		instrumentProviders(config);
	}

	public get prompt() {
		return this._basaltSdk.prompt;
	}

	public get monitor() {
		return this._basaltSdk.monitor;
	}

	public get dataset() {
		return this._basaltSdk.dataset;
	}
}
