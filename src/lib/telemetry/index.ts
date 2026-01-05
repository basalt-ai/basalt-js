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
	ObserveOptions,
	SpanCallback,
	SpanOptions,
	StartObserveOptions,
	TraceExperiment,
} from "./types";
export { ObserveKind } from "./types";
