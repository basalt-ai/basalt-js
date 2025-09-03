import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPTraceExporter as OTLPGrpcTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';

/**
 * Configuration options for OpenTelemetry initialization
 */
export interface OpenTelemetryConfig {
	/**
	 * OTLP endpoint URL for trace export.
	 * Can also be set via OTEL_EXPORTER_OTLP_ENDPOINT environment variable.
	 * @default 'http://localhost:4318/v1/traces' for HTTP, 'http://localhost:4317' for gRPC
	 */
	endpoint?: string;

	/**
	 * OTLP exporter type - HTTP or gRPC
	 * @default 'http'
	 */
	exporterType?: 'http' | 'grpc';

	/**
	 * Service name for traces.
	 * Can also be set via OTEL_SERVICE_NAME environment variable.
	 * @default 'basalt-js-client'
	 */
	serviceName?: string;

	/**
	 * Service version for traces.
	 * Can also be set via OTEL_SERVICE_VERSION environment variable.
	 */
	serviceVersion?: string;

	/**
	 * Additional resource attributes
	 */
	resourceAttributes?: Record<string, string | number | boolean>;

	/**
	 * Headers to send with OTLP requests.
	 * Can also be set via OTEL_EXPORTER_OTLP_HEADERS environment variable.
	 */
	headers?: Record<string, string>;

	/**
	 * Enable additional instrumentations beyond the default set
	 * @default true
	 */
	enableAutoInstrumentations?: boolean;

	/**
	 * Enable HTTP instrumentation for API calls to providers like Mistral
	 * @default true
	 */
	enableHttpInstrumentation?: boolean;

	/**
	 * Enable undici instrumentation for fetch-based calls
	 * @default true
	 */
	enableUndiciInstrumentation?: boolean;

	/**
	 * Custom instrumentation configuration
	 */
	instrumentationConfig?: {
		/**
		 * HTTP hosts to instrument for GenAI provider calls
		 * @default ['api.openai.com', 'api.mistral.ai']
		 */
		genaiHosts?: string[];
	};
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<Omit<OpenTelemetryConfig, 'serviceVersion' | 'resourceAttributes' | 'headers' | 'instrumentationConfig'>> & 
	Pick<OpenTelemetryConfig, 'serviceVersion' | 'resourceAttributes' | 'headers' | 'instrumentationConfig'> = {
	endpoint: '',
	exporterType: 'http',
	serviceName: 'basalt-js-client',
	serviceVersion: undefined,
	resourceAttributes: {},
	headers: {},
	enableAutoInstrumentations: true,
	enableHttpInstrumentation: true,
	enableUndiciInstrumentation: true,
	instrumentationConfig: undefined,
};

let sdkInstance: NodeSDK | null = null;
let shutdownHandlerRegistered = false;

/**
 * Initialize OpenTelemetry instrumentation for Node.js clients.
 * 
 * This function sets up OpenTelemetry with instrumentations for:
 * - OpenAI SDK (via auto-instrumentations)
 * - HTTP requests (for providers like Mistral)
 * - Undici/fetch calls
 * - OTLP trace export to collectors/backends
 * 
 * @param config Configuration options for OpenTelemetry setup
 * @returns Promise that resolves when initialization is complete
 * 
 * @example
 * ```typescript
 * import { initOpenTelemetry } from '@basalt-ai/sdk';
 * 
 * // Basic setup with environment variables
 * await initOpenTelemetry({
 *   serviceName: 'my-ai-app',
 *   endpoint: 'http://localhost:4318/v1/traces'
 * });
 * 
 * // Advanced setup with custom configuration
 * await initOpenTelemetry({
 *   serviceName: 'my-ai-app',
 *   serviceVersion: '1.0.0',
 *   endpoint: 'https://api.honeycomb.io/v1/traces/my-dataset',
 *   headers: {
 *     'x-honeycomb-team': 'your-api-key'
 *   },
 *   instrumentationConfig: {
 *     genaiHosts: ['api.openai.com', 'api.mistral.ai', 'api.anthropic.com']
 *   }
 * });
 * ```
 */
export async function initOpenTelemetry(config: OpenTelemetryConfig = {}): Promise<void> {
	// If already initialized, shutdown first
	if (sdkInstance) {
		await shutdown();
	}

	// Merge with defaults and environment variables
	const finalConfig = mergeWithEnvironment(config);

	// Create trace exporter
	const traceExporter = createTraceExporter(finalConfig);

	// Create resource with service information
	const resource = createResource(finalConfig);

	// Set up instrumentations
	const instrumentations = createInstrumentations(finalConfig);

	// Create and start SDK
	sdkInstance = new NodeSDK({
		resource,
		traceExporter,
		instrumentations,
	});

	await sdkInstance.start();

	// Register shutdown handler only once
	if (!shutdownHandlerRegistered) {
		process.on('SIGTERM', shutdown);
		process.on('SIGINT', shutdown);
		shutdownHandlerRegistered = true;
	}
}

/**
 * Shutdown OpenTelemetry SDK gracefully
 */
export async function shutdown(): Promise<void> {
	if (sdkInstance) {
		await sdkInstance.shutdown();
		sdkInstance = null;
	}
}

/**
 * Merge configuration with environment variables
 */
function mergeWithEnvironment(config: OpenTelemetryConfig): Required<OpenTelemetryConfig> {
	const envEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;
	const envServiceName = process.env.OTEL_SERVICE_NAME;
	const envServiceVersion = process.env.OTEL_SERVICE_VERSION;
	const envHeaders = process.env.OTEL_EXPORTER_OTLP_HEADERS;

	// Parse headers from environment
	const parsedHeaders: Record<string, string> = {};
	if (envHeaders) {
		envHeaders.split(',').forEach(header => {
			const [key, value] = header.split('=');
			if (key && value) {
				parsedHeaders[key.trim()] = value.trim();
			}
		});
	}

	// Set default endpoint based on exporter type if not provided
	const exporterType = config.exporterType || DEFAULT_CONFIG.exporterType;
	const defaultEndpoint = exporterType === 'grpc' 
		? 'http://localhost:4317' 
		: 'http://localhost:4318/v1/traces';

	return {
		...DEFAULT_CONFIG,
		...config,
		endpoint: config.endpoint || envEndpoint || defaultEndpoint,
		serviceName: config.serviceName || envServiceName || DEFAULT_CONFIG.serviceName,
		serviceVersion: config.serviceVersion || envServiceVersion || DEFAULT_CONFIG.serviceVersion,
		resourceAttributes: {
			...DEFAULT_CONFIG.resourceAttributes,
			...config.resourceAttributes,
		},
		headers: {
			...parsedHeaders,
			...DEFAULT_CONFIG.headers,
			...config.headers,
		},
		instrumentationConfig: {
			genaiHosts: ['api.openai.com', 'api.mistral.ai'],
			...DEFAULT_CONFIG.instrumentationConfig,
			...config.instrumentationConfig,
		},
	};
}

/**
 * Create OTLP trace exporter
 */
function createTraceExporter(config: Required<OpenTelemetryConfig>) {
	const exporterConfig = {
		url: config.endpoint,
		headers: config.headers,
	};

	if (config.exporterType === 'grpc') {
		return new OTLPGrpcTraceExporter(exporterConfig);
	} else {
		return new OTLPTraceExporter(exporterConfig);
	}
}

/**
 * Create resource with service information
 */
function createResource(config: Required<OpenTelemetryConfig>): Resource {
	const attributes: Record<string, string | number | boolean> = {
		[ATTR_SERVICE_NAME]: config.serviceName,
		...config.resourceAttributes,
	};

	if (config.serviceVersion) {
		attributes[ATTR_SERVICE_VERSION] = config.serviceVersion;
	}

	return new Resource(attributes);
}

/**
 * Create instrumentations
 */
function createInstrumentations(config: Required<OpenTelemetryConfig>) {
	const instrumentations = [];

	if (config.enableAutoInstrumentations) {
		// Auto-instrumentations include OpenAI and many other libraries
		instrumentations.push(getNodeAutoInstrumentations({
			// Disable file system instrumentation as it's typically not needed for AI applications
			'@opentelemetry/instrumentation-fs': {
				enabled: false,
			},
		}));
	}

	if (config.enableHttpInstrumentation) {
		// HTTP instrumentation for GenAI providers like Mistral that use HTTP directly
		instrumentations.push(new HttpInstrumentation({
			// Enhance spans for GenAI providers
			responseHook: (span, message) => {
				// Add GenAI semantic conventions based on the request URL
				const url = span.getAttributes()['http.url'] as string;
				if (url && config.instrumentationConfig?.genaiHosts?.some(host => url.includes(host))) {
					// This will be enhanced by provider-specific instrumentations
					span.setAttributes({
						'gen_ai.system': 'genai_provider',
					});
				}
			},
		}));
	}

	if (config.enableUndiciInstrumentation) {
		// Undici instrumentation for fetch-based calls
		instrumentations.push(new UndiciInstrumentation());
	}

	return instrumentations;
}