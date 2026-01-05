import type { Context } from '@opentelemetry/api'
import type { BasaltContext } from './types'
import { flattenMetadata, getCurrentContext } from './telemetry'

/**
 * Symbol key for storing Basalt context in OpenTelemetry context
 */
const BASALT_CONTEXT_KEY = Symbol.for('basalt-context')

/**
 * Manages Basalt-specific context (user, organization, experiment, metadata)
 * that gets propagated through OpenTelemetry spans
 */
export class BasaltContextManager {
	/**
	 * Set Basalt context in the current OpenTelemetry context
	 * Returns a new context with the Basalt context attached
	 *
	 * @param ctx - Basalt context to set
	 */
	static setContext(ctx: BasaltContext): Context | undefined {
		const otelContext = getCurrentContext()
		if (!otelContext) {
			return undefined
		}

		try {
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const otel = require('@opentelemetry/api')
			return otelContext.setValue(BASALT_CONTEXT_KEY, ctx)
		} catch {
			return undefined
		}
	}

	/**
	 * Get Basalt context from the current OpenTelemetry context
	 */
	static getContext(): BasaltContext | undefined {
		const otelContext = getCurrentContext()
		if (!otelContext) {
			return undefined
		}

		try {
			return otelContext.getValue(BASALT_CONTEXT_KEY) as
				| BasaltContext
				| undefined
		} catch {
			return undefined
		}
	}

	/**
	 * Execute a function within a Basalt context
	 *
	 * @param basaltCtx - Basalt context to use
	 * @param fn - Function to execute
	 */
	static withContext<T>(basaltCtx: BasaltContext, fn: () => T): T {
		try {
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const otel = require('@opentelemetry/api')
			const currentContext = otel.context.active()
			const newContext = currentContext.setValue(BASALT_CONTEXT_KEY, basaltCtx)
			return otel.context.with(newContext, fn)
		} catch {
			// If OTel not available, just execute the function
			return fn()
		}
	}

	/**
	 * Extract span attributes from the current Basalt context
	 * Returns a flat object of attributes ready to be attached to spans
	 */
	static extractAttributes(): Record<string, string | number | boolean> {
		const ctx = this.getContext()
		if (!ctx) {
			return {}
		}

		const attributes: Record<string, string | number | boolean> = {}

		// User attributes
		if (ctx.user?.id) {
			attributes['basalt.user.id'] = ctx.user.id
		}
		if (ctx.user?.name) {
			attributes['basalt.user.name'] = ctx.user.name
		}

		// Organization attributes
		if (ctx.organization?.id) {
			attributes['basalt.organization.id'] = ctx.organization.id
		}
		if (ctx.organization?.name) {
			attributes['basalt.organization.name'] = ctx.organization.name
		}

		// Experiment attributes
		if (ctx.experiment?.id) {
			attributes['basalt.experiment.id'] = ctx.experiment.id
		}
		if (ctx.experiment?.name) {
			attributes['basalt.experiment.name'] = ctx.experiment.name
		}
		if (ctx.experiment?.featureSlug) {
			attributes['basalt.experiment.feature_slug'] = ctx.experiment.featureSlug
		}

		// Feature slug
		if (ctx.featureSlug) {
			attributes['basalt.span.feature_slug'] = ctx.featureSlug
		}

		// Flatten metadata with basalt.meta. prefix
		const metadataAttrs = flattenMetadata(ctx.metadata)
		Object.assign(attributes, metadataAttrs)

		return attributes
	}

	/**
	 * Merge new context with existing context
	 * Useful for updating context without losing existing values
	 *
	 * @param updates - Partial context to merge
	 */
	static mergeContext(updates: Partial<BasaltContext>): Context | undefined {
		const existing = this.getContext() || {}
		const merged: BasaltContext = {
			...existing,
			...updates,
			// Deep merge user, organization, experiment
			user: updates.user ? { ...existing.user, ...updates.user } : existing.user,
			organization: updates.organization
				? { ...existing.organization, ...updates.organization }
				: existing.organization,
			experiment: updates.experiment
				? { ...existing.experiment, ...updates.experiment }
				: existing.experiment,
			metadata: updates.metadata
				? { ...existing.metadata, ...updates.metadata }
				: existing.metadata,
		}

		return this.setContext(merged)
	}

	/**
	 * Execute a function within a Basalt context that is merged into the current one.
	 * This is the recommended way to "mutate" context safely across async boundaries.
	 */
	static withMergedContext<T>(updates: Partial<BasaltContext>, fn: () => T): T {
		try {
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const otel = require('@opentelemetry/api')
			const currentContext = otel.context.active()
			const existing = currentContext.getValue(BASALT_CONTEXT_KEY) as BasaltContext | undefined
			const merged: BasaltContext = {
				...(existing ?? {}),
				...updates,
				user: updates.user ? { ...(existing?.user ?? {}), ...updates.user } : existing?.user,
				organization: updates.organization
					? { ...(existing?.organization ?? {}), ...updates.organization }
					: existing?.organization,
				experiment: updates.experiment
					? { ...(existing?.experiment ?? {}), ...updates.experiment }
					: existing?.experiment,
				metadata: updates.metadata
					? { ...(existing?.metadata ?? {}), ...updates.metadata }
					: existing?.metadata,
			}

			const newContext = currentContext.setValue(BASALT_CONTEXT_KEY, merged)
			return otel.context.with(newContext, fn)
		} catch {
			return fn()
		}
	}
}
