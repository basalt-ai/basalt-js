import { Span, SpanStatusCode, SpanStatus, Attributes } from '@opentelemetry/api'
import type { BasaltContext } from './types'
import { BASALT_ATTRIBUTES } from './attributes'
import { sanitizeAttributes } from './telemetry'

/**
 * Base handle wrapping an OpenTelemetry Span
 * Provides a simplified, controlled interface for span operations
 * without exposing the raw OTel Span API
 */
export class SpanHandle {
	protected readonly span: Span

	constructor(span: Span) {
		this.span = span
	}

	/**
	 * Set a single attribute on the span
	 * Values are sanitized before being set
	 */
	setAttribute(key: string, value: unknown): void {
		const sanitized = sanitizeAttributes({ [key]: value })
		if (sanitized[key] !== undefined) {
			this.span.setAttribute(key, sanitized[key])
		}
	}

	/**
	 * Set multiple attributes on the span
	 * Values are sanitized before being set
	 */
	setAttributes(attributes: Attributes): void {
		const sanitized = sanitizeAttributes(attributes)
		this.span.setAttributes(sanitized)
	}

	/**
	 * Set the span status
	 * Use SpanStatusCode.OK for successful operations
	 * Use SpanStatusCode.ERROR for failures
	 */
	setStatus(status: SpanStatus): void {
		this.span.setStatus(status)
	}

	/**
	 * Add a timed event to the span
	 * Useful for recording significant moments during span execution
	 */
	addEvent(name: string, attributes?: Attributes): void {
		this.span.addEvent(name, attributes)
	}

	/**
	 * End the span
	 * Must be called to ensure the span is exported
	 * @param endTime Optional timestamp in milliseconds
	 */
	end(endTime?: number): void {
		this.span.end(endTime)
	}

	/**
	 * Record an exception on the span and set error status
	 * Automatically marks the span as failed
	 */
	recordException(exception: Error): void {
		this.span.recordException(exception)
		this.span.setStatus({ code: SpanStatusCode.ERROR, message: exception.message })
	}

	/**
	 * Type guard to check if this is a root span handle
	 */
	isRootSpan(): this is StartSpanHandle {
		return this instanceof StartSpanHandle
	}
}

/**
 * Root span handle with additional capabilities for experiment tracking,
 * identity management, and evaluation configuration
 * 
 * Only root spans (created via startObserve()) have these methods
 */
export class StartSpanHandle extends SpanHandle {
	private readonly basaltContext: BasaltContext

	constructor(span: Span, featureSlug: string) {
		super(span)
		this.basaltContext = {}
		if (featureSlug) {
			this.basaltContext.featureSlug = featureSlug
		}

		// Root spans always have these markers
		this.setAttribute(BASALT_ATTRIBUTES.TRACE, true)
		this.setAttribute(BASALT_ATTRIBUTES.IN_TRACE, 'true')
		this.setAttribute(BASALT_ATTRIBUTES.SPAN_KIND, 'basalt_trace')
		// Feature slug is mandatory for root spans
		this.setAttribute(BASALT_ATTRIBUTES.FEATURE_SLUG, featureSlug)
	}

	/**
	 * Get the underlying OpenTelemetry span
	 * @internal Used by context manager to set active span
	 */
	getSpan(): Span {
		return this.span
	}

	/**
	 * Get Basalt context captured from root span configuration
	 * @internal Used by context manager to propagate attributes
	 */
	getBasaltContext(): BasaltContext {
		return this.basaltContext
	}

	/**
	 * Associate this observation with an experiment
	 * Sets experiment attributes following Python SDK structure
	 * 
	 * @param experiment Experiment metadata with id, name, and featureSlug
	 * @returns this for method chaining
	 */
	setExperiment(experiment: { id: string; name?: string; featureSlug?: string }): this {
		this.setAttribute(BASALT_ATTRIBUTES.EXPERIMENT_ID, experiment.id)
		if (experiment.name) {
			this.setAttribute(BASALT_ATTRIBUTES.EXPERIMENT_NAME, experiment.name)
		}
		if (experiment.featureSlug) {
			this.setAttribute(BASALT_ATTRIBUTES.EXPERIMENT_FEATURE_SLUG, experiment.featureSlug)
		}
		this.basaltContext.experiment = {
			id: experiment.id,
			name: experiment.name ?? this.basaltContext.experiment?.name,
			featureSlug: experiment.featureSlug ?? this.basaltContext.experiment?.featureSlug,
		}
		return this
	}

	/**
	 * Set evaluation configuration for this observation
	 * Configuration is stored as a JSON string attribute
	 * 
	 * @param config The evaluation configuration object
	 * @returns this for method chaining
	 */
	setEvaluationConfig(config: Record<string, unknown> | unknown): this {
		this.setAttribute(BASALT_ATTRIBUTES.EVALUATION_CONFIG, JSON.stringify(config))
		return this
	}

	/**
	 * Set identity information for this observation
	 * Sets identity attributes following basalt.{user|organization}.{id|name} format
	 * 
	 * @param identity Object containing userId, organizationId, userName, organizationName, and optional custom fields
	 * @returns this for method chaining
	 */
	setIdentity(identity: {
		userId?: string
		organizationId?: string
		userName?: string
		organizationName?: string
		[key: string]: unknown
	}): this {
		if (identity.userId) {
			this.setAttribute(BASALT_ATTRIBUTES.USER_ID, identity.userId)
		}
		if (identity.userName) {
			this.setAttribute(BASALT_ATTRIBUTES.USER_NAME, identity.userName)
		}
		if (identity.organizationId) {
			this.setAttribute(BASALT_ATTRIBUTES.ORG_ID, identity.organizationId)
		}
		if (identity.organizationName) {
			this.setAttribute(BASALT_ATTRIBUTES.ORG_NAME, identity.organizationName)
		}

		const userId = identity.userId ?? this.basaltContext.user?.id
		if (userId) {
			this.basaltContext.user = {
				id: userId,
				name: identity.userName ?? this.basaltContext.user?.name,
			}
		}

		const organizationId =
			identity.organizationId ?? this.basaltContext.organization?.id
		if (organizationId) {
			this.basaltContext.organization = {
				id: organizationId,
				name: identity.organizationName ?? this.basaltContext.organization?.name,
			}
		}

		return this
	}
}
