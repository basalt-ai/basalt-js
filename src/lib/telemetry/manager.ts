import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions'
import { BasaltSpanProcessor } from '../instrumentation/basalt-span-processor'

export interface TelemetryManagerConfig {
	apiKey: string
	endpoint: string
	insecure: boolean
	metadata?: Record<string, string>
	serviceName: string
}

export class TelemetryManager {
	private static instance?: TelemetryManager
	private static refCount = 0
	private provider?: NodeTracerProvider
	private isShutdown = false

	private constructor(private readonly config: TelemetryManagerConfig) {}

	/**
	 * Initialize or return existing TelemetryManager singleton
	 * Multiple SDK instances share the same TracerProvider
	 */
	static initialize(config: TelemetryManagerConfig): TelemetryManager {
		if (!TelemetryManager.instance) {
			TelemetryManager.instance = new TelemetryManager(config)
			TelemetryManager.instance.setup()
		}
		TelemetryManager.refCount++
		return TelemetryManager.instance
	}

	private setup(): void {
		try {
			// Create exporter with authentication
			const grpc = require('@grpc/grpc-js')

			const exporter = new OTLPTraceExporter({
				url: this.config.endpoint,
				credentials: this.config.insecure
					? grpc.credentials.createInsecure()
					: grpc.credentials.createSsl(),
				metadata: this.createMetadata(),
			})

			// Create batch processor for efficient export
			const batchProcessor = new BatchSpanProcessor(exporter)

			// Create Basalt span processor to inject context attributes
			const basaltProcessor = new BasaltSpanProcessor()

			// Create TracerProvider with resource and processors
			// IMPORTANT: BasaltSpanProcessor must be registered BEFORE BatchSpanProcessor
			// so that attributes are added before export
			this.provider = new NodeTracerProvider({
				resource: resourceFromAttributes({
					[ATTR_SERVICE_NAME]: this.config.serviceName,
					'basalt.sdk.name': '@basalt-ai/sdk',
					'basalt.sdk.version': __SDK_VERSION__,
				}),
				spanProcessors: [basaltProcessor, batchProcessor],
			})

			// Register as global provider
			this.provider.register()
		} catch (error) {
			// Failed to setup - will fall back to no-op tracer
			console.warn('Telemetry setup failed:', error)
		}
	}

	private createMetadata(): any {
		const grpc = require('@grpc/grpc-js')
		const metadata = new grpc.Metadata()

		// Add Bearer token for authentication (Python SDK parity)
		metadata.add('authorization', `Bearer ${this.config.apiKey}`)

		// Add SDK metadata for debugging
		metadata.add('basalt-sdk-name', '@basalt-ai/sdk')
		metadata.add('basalt-sdk-version', __SDK_VERSION__)

		// Add any custom metadata
		if (this.config.metadata) {
			Object.entries(this.config.metadata).forEach(([key, value]) => {
				metadata.add(key, value)
			})
		}

		return metadata
	}

	/**
	 * Gracefully shutdown telemetry
	 * Reference counting: only shutdown when last instance is done
	 */
	async shutdown(): Promise<void> {
		TelemetryManager.refCount--

		if (TelemetryManager.refCount === 0 && !this.isShutdown) {
			try {
				if (this.provider) {
					await this.provider.shutdown()
				}
				this.isShutdown = true
				TelemetryManager.instance = undefined
			} catch (error) {
				console.warn('Telemetry shutdown failed:', error)
			}
		}
	}

	/**
	 * Force flush pending spans
	 */
	async forceFlush(): Promise<void> {
		try {
			if (this.provider) {
				await this.provider.forceFlush()
			}
		} catch (error) {
			console.warn('Telemetry force flush failed:', error)
		}
	}
}
