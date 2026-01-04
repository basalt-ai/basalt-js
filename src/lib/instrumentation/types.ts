/**
 * Configuration for a single provider's instrumentation
 */
export interface ProviderInstrumentationConfig {
	enabled: boolean
	/**
	 * Capture full message content (prompts and responses)
	 * When false, only captures metadata (tokens, model, etc.)
	 * @default true
	 */
	captureContent?: boolean
}

/**
 * Configuration for enabling GenAI provider auto-instrumentation
 */
export interface InstrumentationConfig {
	/**
	 * Enable OpenAI instrumentation
	 * Uses @opentelemetry/instrumentation-openai
	 */
	openai?: boolean | ProviderInstrumentationConfig

	/**
	 * Enable Anthropic instrumentation
	 * Uses @traceloop/instrumentation-anthropic
	 */
	anthropic?: boolean | ProviderInstrumentationConfig

	/**
	 * Enable AWS Bedrock instrumentation
	 * Uses @traceloop/instrumentation-bedrock
	 */
	bedrock?: boolean | ProviderInstrumentationConfig
}
