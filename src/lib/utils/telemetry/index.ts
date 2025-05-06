import {
	Counter, Histogram, Meter, metrics, trace,
} from '@opentelemetry/api'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { BatchSpanProcessor, NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions'

import { Logger } from '../../resources/contract'

// Configuration type for telemetry
export interface TelemetryConfig {
	enabled: boolean
	endpoint?: string
	samplingRate?: number
}

// Default configuration
const DEFAULT_CONFIG: TelemetryConfig = {
	enabled: false,
	endpoint: 'http://localhost:4318',
	samplingRate: 1.0,
}

// Metrics data type for recording metrics
export interface MetricsData {
	[key: string]: unknown
	cost?: number
	latency?: number
	inputTokens?: number
	outputTokens?: number
	featureSlug?: string
	promptSlug?: string
	promptVersion?: string
	deploymentTag?: string
	organizationId?: string
	organizationName?: string
	userId?: string
	userName?: string
}

// Singleton class to manage telemetry
export class TelemetryManager {
	private static _instance: TelemetryManager
	public static getInstance(): TelemetryManager {
		if (!TelemetryManager._instance) {
			TelemetryManager._instance = new TelemetryManager()
		}
		return TelemetryManager._instance
	}

	private _config: TelemetryConfig = DEFAULT_CONFIG
	private _isInitialized = false
	private _meterProvider?: MeterProvider
	private _tracerProvider?: NodeTracerProvider
	private _costMeter?: Meter
	private _latencyMeter?: Meter
	private _tokensMeter?: Meter
	private _costMetric?: Counter
	private _latencyMetric?: Histogram
	private _inputTokensMetric?: Counter
	private _outputTokensMetric?: Counter
	private _logger?: Logger

	private constructor() {
		// Private constructor for singleton pattern
	}

	public init(config: Partial<TelemetryConfig> = {}, logger?: Logger): void {
		this._config = { ...DEFAULT_CONFIG, ...config }
		this._logger = logger

		if (!this._config.enabled) {
			this._logger?.info('Telemetry is disabled')
			return
		}

		try {
			if (this._isInitialized) {
				this._logger?.info('Telemetry already initialized')
				return
			}

			// Initialize the resource
			const resource = resourceFromAttributes({
				[ATTR_SERVICE_NAME]: 'basalt-sdk',
				[ATTR_SERVICE_VERSION]: '__SDK_VERSION__',
			})

			// Configure metric exporter
			const metricExporter = new OTLPMetricExporter({
				url: `${this._config.endpoint}/v1/metrics`,
			})

			// Create and configure meter provider
			this._meterProvider = new MeterProvider({
				resource,
				readers: [
					new PeriodicExportingMetricReader({
						exporter: metricExporter,
						exportIntervalMillis: 1000,
					}),
				],
			})

			// Set up the global meter provider
			metrics.setGlobalMeterProvider(this._meterProvider)

			// Create trace exporter
			const traceExporter = new OTLPTraceExporter({
				url: `${this._config.endpoint}/v1/traces`,
			})

			// Create and configure tracer provider
			this._tracerProvider = new NodeTracerProvider({
				resource,
				spanProcessors: [
					new BatchSpanProcessor(traceExporter, {
						// The maximum queue size. After the size is reached spans are dropped.
						maxQueueSize: 100,
						// The maximum batch size of every export. It must be smaller or equal to maxQueueSize.
						maxExportBatchSize: 10,
						// The interval between two consecutive exports
						scheduledDelayMillis: 500,
						// How long the export can run before it is cancelled
						exportTimeoutMillis: 30000,
					}),
				],
			})

			// Register the provider
			trace.setGlobalTracerProvider(this._tracerProvider)

			// Initialize metrics
			this._initMetrics()

			this._isInitialized = true
			this._logger?.info('Telemetry initialized', { endpoint: this._config.endpoint })
		}
		catch (error) {
			this._logger?.error('Failed to initialize telemetry', { error })
		}
	}

	public recordMetrics(data: MetricsData): void {
		if (!this._config.enabled || !this._isInitialized) {
			return
		}

		try {
			const attributes = {
				'feature.slug': data.featureSlug ?? 'unknown',
				'prompt.slug': data.promptSlug ?? 'unknown',
				'prompt.version': data.promptVersion ?? 'unknown',
				'deployment.tag': data.deploymentTag ?? 'unknown',
				'organization.id': data.organizationId ?? 'unknown',
				'organization.name': data.organizationName ?? 'unknown',
				'user.id': data.userId ?? 'unknown',
				'user.name': data.userName ?? 'unknown',
			}

			// Record cost metric
			if (data.cost !== undefined && data.cost > 0 && this._costMetric) {
				this._costMetric.add(data.cost, attributes)
			}

			// Record latency metric
			if (data.latency !== undefined && data.latency > 0 && this._latencyMetric) {
				this._latencyMetric.record(data.latency, attributes)
			}

			// Record input tokens metric
			if (data.inputTokens !== undefined && data.inputTokens > 0 && this._inputTokensMetric) {
				this._inputTokensMetric.add(data.inputTokens, attributes)
			}

			// Record output tokens metric
			if (data.outputTokens !== undefined && data.outputTokens > 0 && this._outputTokensMetric) {
				this._outputTokensMetric.add(data.outputTokens, attributes)
			}
		}
		catch (error) {
			this._logger?.error('Failed to record metrics', { error, data })
		}
	}

	public calculateLatency(startTime?: Date, endTime?: Date): number | undefined {
		if (!startTime) {
			return undefined
		}

		const end = endTime ?? new Date()
		return end.getTime() - startTime.getTime()
	}

	private _initMetrics(): void {
		if (!this._config.enabled || !this._meterProvider) {
			return
		}

		// Create meters
		this._costMeter = metrics.getMeter('basalt.cost')
		this._latencyMeter = metrics.getMeter('basalt.latency')
		this._tokensMeter = metrics.getMeter('basalt.tokens')

		// Create metrics
		this._costMetric = this._costMeter.createCounter('basalt.prompt.cost', {
			description: 'Cost of prompt execution',
			unit: 'usd',
		})

		this._latencyMetric = this._latencyMeter.createHistogram('basalt.prompt.latency', {
			description: 'Latency of prompt execution',
			unit: 'ms',
		})

		this._inputTokensMetric = this._tokensMeter.createCounter('basalt.prompt.input_tokens', {
			description: 'Number of input tokens',
			unit: 'tokens',
		})

		this._outputTokensMetric = this._tokensMeter.createCounter('basalt.prompt.output_tokens', {
			description: 'Number of output tokens',
			unit: 'tokens',
		})
	}
}

// Export singleton instance
export const telemetry = TelemetryManager.getInstance()

// Convenience function for recording metrics
export const recordMetrics = (data: MetricsData): void => {
	telemetry.recordMetrics(data)
}

// Convenience function for calculating latency
export const calculateLatency = (startTime?: Date, endTime?: Date): number | undefined => {
	return telemetry.calculateLatency(startTime, endTime)
}
