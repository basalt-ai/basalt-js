import type { Attributes, Span } from "@opentelemetry/api";
import type { SpanHandle } from "./span-handle";

/**
 * Span kind classification for Basalt observations
 * Matches Python SDK ObserveKind enum
 */
export enum ObserveKind {
	ROOT = "basalt_trace",
	SPAN = "span",
	GENERATION = "generation",
	RETRIEVAL = "retrieval",
	FUNCTION = "function",
	TOOL = "tool",
	EVENT = "event",
}

/**
 * Basalt-specific context that can be attached to spans
 */
export interface BasaltContext {
	/**
	 * User information
	 */
	user?: {
		id: string;
		name?: string;
		[key: string]: unknown;
	};

	/**
	 * Organization information
	 */
	organization?: {
		id: string;
		name?: string;
		[key: string]: unknown;
	};

	/**
	 * Experiment context for A/B testing
	 */
	experiment?: {
		id: string;
		name?: string;
		featureSlug?: string;
	};

	/**
	 * Feature slug for the current operation
	 */
	featureSlug?: string;

	/**
	 * Arbitrary metadata to attach to spans
	 */
	metadata?: Record<string, unknown>;
}

/**
 * Options for creating spans
 */
export interface SpanOptions {
	/**
	 * Span attributes
	 */
	attributes?: Attributes;

	/**
	 * Whether to record exceptions in the span
	 */
	recordException?: boolean;
}

/**
 * Options for creating child observation spans (observe)
 * Does not include experiment or identity (use StartObserveOptions for root spans)
 */
export interface ObserveOptions {
	readonly name?: string;
	readonly attributes?: Record<string, unknown>;
	readonly spanKind?: number;
}

/**
 * Experiment metadata for trace observation
 */
export interface TraceExperiment {
	id: string;
	name?: string;
	featureSlug?: string;
}

/**
 * Options for starting a root observation span (startObserve)
 * Includes experiment and identity parameters for root spans only
 */
export interface StartObserveOptions {
	readonly name?: string;
	readonly attributes?: Record<string, unknown>;
	readonly spanKind?: number;
	/**
	 * Feature slug for the observation (mandatory)
	 */
	readonly featureSlug: string;
	/**
	 * Experiment context for A/B testing
	 */
	readonly experiment?: TraceExperiment;
	/**
	 * Identity information for tracking
	 */
	readonly identity?: {
		userId?: string;
		userName?: string;
		organizationId?: string;
		organizationName?: string;
		[key: string]: unknown;
	};
}

/**
 * Function type for span callback
 * Now receives a SpanHandle with setInput/setOutput methods
 */
export type SpanCallback<T> = (span: SpanHandle) => Promise<T>;

/**
 * Attribute value types accepted by OpenTelemetry
 */
export type AttributeValue = string | number | boolean | null | undefined;

/**
 * Dictionary of attributes
 */
export type AttributeDict = Record<string, AttributeValue>;
