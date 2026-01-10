/**
 * GenAI Provider Auto-Instrumentation
 *
 * This module provides automatic instrumentation for GenAI providers using
 * existing OpenTelemetry instrumentation libraries.
 *
 * Supported providers:
 * - OpenAI (@opentelemetry/instrumentation-openai)
 * - Anthropic (@traceloop/instrumentation-anthropic)
 * - AWS Bedrock (@traceloop/instrumentation-bedrock)
 *
 * @example
 * ```typescript
 * import Basalt from '@basalt-ai/sdk'
 *
 * const basalt = new Basalt({ apiKey: 'xxx' })
 *
 * // Enable instrumentation
 * basalt.instrument({
 *   openai: true,
 *   anthropic: { captureContent: false }
 * })
 * ```
 */

export { BasaltSpanProcessor } from "./basalt-span-processor";
export { instrument } from "./registry";
export type {
	InstrumentationConfig,
	ProviderInstrumentationConfig,
} from "./types";
