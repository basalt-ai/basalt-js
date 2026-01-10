import type { Attributes } from "@opentelemetry/api";
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
	experiment_id?: string;

	/**
	 * Feature slug for the current operation
	 */
	featureSlug?: string;

	/**
	 * Arbitrary metadata to attach to spans
	 */
	metadata?: Record<string, unknown>;

	/**
	 * Evaluators to run on spans created within this context
	 * Array of evaluator slugs like ["hallucinations", "clarity"]
	 */
	evaluators?: string[];

	/**
	 * Evaluation configuration for spans in this context
	 */
	evaluationConfig?: {
		sample_rate?: number;
		should_evaluate?: boolean;
		[key: string]: unknown;
	};

	/**
	 * Prompts used within this context
	 * Array of prompt metadata that will be attached to spans
	 */
	prompts?: PromptMetadata[];
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
	readonly metadata?: Record<string, unknown>;
	readonly spanKind?: number;
	/**
	 * Feature slug for the observation (mandatory)
	 */
	readonly featureSlug: string;
	/**
	 * Experiment context for A/B testing
	 */
	readonly experiment_id?: string;
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
	/**
	 * Evaluators to run on this observation
	 * Array of evaluator slugs like ["hallucinations", "clarity"]
	 */
	readonly evaluators?: string[];
	/**
	 * Evaluation configuration for this observation (root spans only)
	 */
	readonly evaluationConfig?: {
		sample_rate?: number;
		should_evaluate?: boolean;
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

/**
 * Configuration for evaluation behavior
 */
export interface EvaluationConfig {
	/**
	 * Sample rate for evaluation (0-1)
	 */
	sample_rate?: number;
	/**
	 * Whether this trace should be evaluated
	 */
	should_evaluate?: boolean;
	/**
	 * Additional configuration options
	 */
	[key: string]: unknown;
}

/**
 * Metadata about a prompt used within this context
 */
export interface PromptMetadata {
	slug: string;
	version?: string;
	tag?: string;
	variables?: Record<string, unknown>;
	model: {
		provider: string;
		model: string;
	};
	fromCache: boolean;
}

/**
 * Options for withEvaluators function
 */
export interface WithEvaluatorsOptions {
	/**
	 * Evaluator slugs to attach
	 */
	evaluators: string[];
	/**
	 * Optional evaluation configuration
	 */
	evaluationConfig?: EvaluationConfig;
}
