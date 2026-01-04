import type { InstrumentationConfig, ProviderInstrumentationConfig } from './types'

/**
 * Singleton registry for managing GenAI provider instrumentations.
 *
 * This class is responsible for:
 * - Loading instrumentation packages on-demand
 * - Registering instrumentations with OpenTelemetry
 * - Gracefully handling missing packages
 */
class InstrumentationRegistry {
	private static instance?: InstrumentationRegistry
	private registeredInstrumentations: any[] = []

	private constructor() {
		// Private constructor for singleton pattern
	}

	static getInstance(): InstrumentationRegistry {
		if (!this.instance) {
			this.instance = new InstrumentationRegistry()
		}
		return this.instance
	}

	/**
	 * Enable instrumentation for specified providers.
	 *
	 * @param config Provider-specific configuration
	 */
	instrument(config: InstrumentationConfig): void {
		const instrumentations: any[] = []

		// OpenAI - Official OpenTelemetry package
		if (config.openai) {
			const openaiInst = this.loadOpenAIInstrumentation(config.openai)
			if (openaiInst) instrumentations.push(openaiInst)
		}

		// Anthropic - Traceloop package
		if (config.anthropic) {
			const anthropicInst = this.loadAnthropicInstrumentation(config.anthropic)
			if (anthropicInst) instrumentations.push(anthropicInst)
		}

		// AWS Bedrock - Traceloop package
		if (config.bedrock) {
			const bedrockInst = this.loadBedrockInstrumentation(config.bedrock)
			if (bedrockInst) instrumentations.push(bedrockInst)
		}

		// Register all loaded instrumentations with OpenTelemetry
		if (instrumentations.length > 0) {
			try {
				// eslint-disable-next-line @typescript-eslint/no-var-requires
				const { registerInstrumentations } = require('@opentelemetry/instrumentation')
				registerInstrumentations({ instrumentations })
				this.registeredInstrumentations.push(...instrumentations)
				console.log(
					`[@basalt-ai/sdk] Registered ${instrumentations.length} instrumentations.`,
				)
			} catch (error) {
				console.warn(
					'[@basalt-ai/sdk] Failed to register instrumentations. ' +
						'Ensure @opentelemetry/instrumentation is installed.',
				)
			}
		}
	}

	/**
	 * Load OpenAI instrumentation package.
	 *
	 * @param config Provider configuration
	 * @returns Instrumentation instance or null if package not found
	 */
	private loadOpenAIInstrumentation(
		config: boolean | ProviderInstrumentationConfig,
	): any {
		try {
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const { OpenAIInstrumentation } = require('@opentelemetry/instrumentation-openai')
			const captureContent =
				typeof config === 'boolean' ? true : config.captureContent ?? true

			return new OpenAIInstrumentation({
				captureMessageContent: captureContent,
			})
		} catch (error) {
			console.warn(
				'[@basalt-ai/sdk] Cannot enable OpenAI instrumentation: package not found.\n' +
					'Install with: npm install @opentelemetry/instrumentation-openai',
			)
			return null
		}
	}

	/**
	 * Load Anthropic instrumentation package.
	 *
	 * @param config Provider configuration
	 * @returns Instrumentation instance or null if package not found
	 */
	private loadAnthropicInstrumentation(
		config: boolean | ProviderInstrumentationConfig,
	): any {
		try {
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const { AnthropicInstrumentation } = require('@traceloop/instrumentation-anthropic')
			const captureContent =
				typeof config === 'boolean' ? true : config.captureContent ?? true

			return new AnthropicInstrumentation({
				enrich: captureContent,
			})
		} catch (error) {
			console.warn(
				'[@basalt-ai/sdk] Cannot enable Anthropic instrumentation: package not found.\n' +
					'Install with: npm install @traceloop/instrumentation-anthropic',
			)
			return null
		}
	}

	/**
	 * Load AWS Bedrock instrumentation package.
	 *
	 * @param config Provider configuration
	 * @returns Instrumentation instance or null if package not found
	 */
	private loadBedrockInstrumentation(
		config: boolean | ProviderInstrumentationConfig,
	): any {
		try {
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const { AwsBedrockInstrumentation } = require('@traceloop/instrumentation-bedrock')
			const captureContent =
				typeof config === 'boolean' ? true : config.captureContent ?? true

			return new AwsBedrockInstrumentation({
				enrich: captureContent,
			})
		} catch (error) {
			console.warn(
				'[@basalt-ai/sdk] Cannot enable Bedrock instrumentation: package not found.\n' +
					'Install with: npm install @traceloop/instrumentation-bedrock',
			)
			return null
		}
	}
}

/**
 * Enable auto-instrumentation for GenAI providers.
 *
 * This function registers OpenTelemetry instrumentations that automatically
 * create spans for LLM API calls. Spans inherit basalt_trace attributes
 * when inside a Basalt observation context.
 *
 * @param config Provider-specific configuration
 *
 * @example
 * ```typescript
 * import { instrument } from '@basalt-ai/sdk'
 *
 * // Enable all providers with defaults
 * instrument({ openai: true, anthropic: true, bedrock: true })
 *
 * // Enable with privacy mode (no message content)
 * instrument({
 *   openai: true,
 *   anthropic: { captureContent: false }
 * })
 * ```
 */
export function instrument(config: InstrumentationConfig): void {
	InstrumentationRegistry.getInstance().instrument(config)
}
