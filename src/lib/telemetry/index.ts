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
} from './telemetry'

export { withBasaltSpan, withBasaltSpanSync } from './basalt-span'

export { BasaltContextManager } from './context-manager'

export { BASALT_ATTRIBUTES, CACHE_TYPES, API_CLIENTS, METADATA_PREFIX } from './attributes'

export { TelemetryManager } from './manager'

export type { BasaltContext, SpanOptions, SpanCallback, AttributeValue, AttributeDict } from './types'

export type { TelemetryManagerConfig } from './manager'