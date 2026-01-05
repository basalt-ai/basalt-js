/**
 * OpenTelemetry instrumentation for Basalt SDK
 *
 * This module provides custom OpenTelemetry instrumentation for the Basalt SDK.
 * It works safely even if OpenTelemetry is not installed or configured by the user.
 *
 * @module telemetry
 */

export {
	getTracer,
	withSpan,
	withSpanSync,
	setCurrentSpanAttributes,
	getCurrentContext,
	withContext,
	isOtelAvailable,
	sanitizeAttributes,
	flattenMetadata,
	extractClientFromPath,
	observe,
	startObserve,
} from './telemetry'

export type { ObserveOptions, StartObserveOptions } from './types'

export { withBasaltSpan, withBasaltSpanSync } from './basalt-span'

export { BasaltContextManager, BASALT_ROOT_SPAN } from './context-manager'

export { SpanHandle, StartSpanHandle } from './span-handle'

export { ObserveKind } from './types'

export { BASALT_ATTRIBUTES, CACHE_TYPES, API_CLIENTS, METADATA_PREFIX } from './attributes'

export { TelemetryManager } from './manager'

export type { BasaltContext, SpanOptions, SpanCallback, AttributeValue, AttributeDict, TraceExperiment } from './types'

export type { TelemetryManagerConfig } from './manager'