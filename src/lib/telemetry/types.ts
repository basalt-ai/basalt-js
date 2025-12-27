import type { Attributes, Span } from '@opentelemetry/api'

/**
 * Basalt-specific context that can be attached to spans
 */
export interface BasaltContext {
	/**
	 * User information
	 */
	user?: {
		id: string
		name?: string
		[key: string]: unknown
	}

	/**
	 * Organization information
	 */
	organization?: {
		id: string
		name?: string
		[key: string]: unknown
	}

	/**
	 * Experiment context for A/B testing
	 */
	experiment?: {
		id: string
		name?: string
		featureSlug?: string
	}

	/**
	 * Feature slug for the current operation
	 */
	featureSlug?: string

	/**
	 * Arbitrary metadata to attach to spans
	 */
	metadata?: Record<string, unknown>
}

/**
 * Options for creating spans
 */
export interface SpanOptions {
	/**
	 * Span attributes
	 */
	attributes?: Attributes

	/**
	 * Whether to record exceptions in the span
	 */
	recordException?: boolean
}

/**
 * Function type for span callback
 */
export type SpanCallback<T> = (span: Span) => Promise<T>

/**
 * Attribute value types accepted by OpenTelemetry
 */
export type AttributeValue = string | number | boolean | null | undefined

/**
 * Dictionary of attributes
 */
export type AttributeDict = Record<string, AttributeValue>
