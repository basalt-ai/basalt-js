/**
 * OpenTelemetry instrumentation for Basalt SDK
 *
 * This module provides custom OpenTelemetry instrumentation for the Basalt SDK.
 * It works safely even if OpenTelemetry is not installed or configured by the user.
 *
 * @module telemetry
 */

export {
	API_CLIENTS,
	BASALT_ATTRIBUTES,
	CACHE_TYPES,
	METADATA_PREFIX,
} from "./attributes";
export { withBasaltSpan, withBasaltSpanSync } from "./basalt-span";
export { BASALT_ROOT_SPAN, BasaltContextManager } from "./context-manager";
export { attachEvaluator, withEvaluators } from "./evaluators";
export { withPrompt, withPrompts } from "./prompts";
export type { TelemetryManagerConfig } from "./manager";
export { TelemetryManager } from "./manager";
export { SpanHandle, StartSpanHandle } from "./span-handle";
export {
	extractClientFromPath,
	flattenMetadata,
	getCurrentContext,
	getTracer,
	isOtelAvailable,
	observe,
	sanitizeAttributes,
	setCurrentSpanAttributes,
	startObserve,
	withContext,
	withSpan,
	withSpanSync,
} from "./telemetry";
export type {
	AttributeDict,
	AttributeValue,
	BasaltContext,
	EvaluationConfig,
	ObserveOptions,
	PromptMetadata,
	SpanCallback,
	SpanOptions,
	StartObserveOptions,
	TraceExperiment,
	WithEvaluatorsOptions,
} from "./types";
export { ObserveKind } from "./types";
