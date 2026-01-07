import type { Context } from "@opentelemetry/api";
import type { StartSpanHandle } from "./span-handle";
import { flattenMetadata, getCurrentContext } from "./telemetry";
import type { BasaltContext, PromptMetadata } from "./types";

/**
 * Symbol key for storing Basalt context in OpenTelemetry context
 */
const BASALT_CONTEXT_KEY = Symbol.for("basalt-context");

/**
 * Symbol key for storing root span handle in OpenTelemetry context
 */
export const BASALT_ROOT_SPAN = Symbol.for("basalt.context.root_span");

/**
 * Manages Basalt-specific context (user, organization, experiment, metadata)
 * that gets propagated through OpenTelemetry spans
 */
export namespace BasaltContextManager {
	/**
	 * Set Basalt context in the current OpenTelemetry context
	 * Returns a new context with the Basalt context attached
	 *
	 * @param ctx - Basalt context to set
	 */
	export function setContext(ctx: BasaltContext): Context | undefined {
		const otelContext = getCurrentContext();
		if (!otelContext) {
			return undefined;
		}

		try {
			const _otel = require("@opentelemetry/api");
			return otelContext.setValue(BASALT_CONTEXT_KEY, ctx);
		} catch {
			return undefined;
		}
	}

	/**
	 * Get Basalt context from the current OpenTelemetry context
	 */
	export function getContext(): BasaltContext | undefined {
		const otelContext = getCurrentContext();
		if (!otelContext) {
			return undefined;
		}

		try {
			return otelContext.getValue(BASALT_CONTEXT_KEY) as
				| BasaltContext
				| undefined;
		} catch {
			return undefined;
		}
	}

	/**
	 * Execute a function within a Basalt context
	 *
	 * @param basaltCtx - Basalt context to use
	 * @param fn - Function to execute
	 */
	export function withContext<T>(basaltCtx: BasaltContext, fn: () => T): T {
		try {
			const otel = require("@opentelemetry/api");
			const currentContext = otel.context.active();
			const newContext = currentContext.setValue(BASALT_CONTEXT_KEY, basaltCtx);
			return otel.context.with(newContext, fn);
		} catch {
			// If OTel not available, just execute the function
			return fn();
		}
	}

	/**
	 * Extract span attributes from the current Basalt context
	 * Returns a flat object of attributes ready to be attached to spans
	 */
	export function extractAttributes(): Record<
		string,
		string | number | boolean
	> {
		const ctx = getContext();
		if (!ctx) {
			return {};
		}

		const attributes: Record<string, string | number | boolean> = {};

		// User attributes
		if (ctx.user?.id) {
			attributes["basalt.user.id"] = ctx.user.id;
		}
		if (ctx.user?.name) {
			attributes["basalt.user.name"] = ctx.user.name;
		}

		// Organization attributes
		if (ctx.organization?.id) {
			attributes["basalt.organization.id"] = ctx.organization.id;
		}
		if (ctx.organization?.name) {
			attributes["basalt.organization.name"] = ctx.organization.name;
		}

		// Experiment attributes
		if (ctx.experiment_id) {
			attributes["basalt.experiment.id"] = ctx.experiment_id;
		}

		// Feature slug
		if (ctx.featureSlug) {
			attributes["basalt.span.feature_slug"] = ctx.featureSlug;
		}

		// Flatten metadata with basalt.meta. prefix
		const metadataAttrs = flattenMetadata(ctx.metadata);
		Object.assign(attributes, metadataAttrs);

		// Add evaluator attributes
		if (ctx.evaluators && ctx.evaluators.length > 0) {
			const validEvaluators = ctx.evaluators.filter(
				(e) => e && typeof e === "string" && e.trim().length > 0,
			);

			if (validEvaluators.length > 0) {
				attributes["basalt.span.evaluators"] = JSON.stringify(validEvaluators);
			}
		}

		// Add evaluation config attributes
		if (ctx.evaluationConfig?.sample_rate !== undefined) {
			const sampleRate = ctx.evaluationConfig.sample_rate;
			if (typeof sampleRate === "number" && !Number.isNaN(sampleRate)) {
				const clampedRate = Math.max(0, Math.min(1, sampleRate));
				attributes["basalt.span.evaluation.sample_rate"] = clampedRate;
			}
		}

		// Add prompt attributes
		if (ctx.prompts && ctx.prompts.length > 0) {
			const validPrompts = ctx.prompts.filter(
				(prompt) =>
					prompt &&
					typeof prompt.slug === "string" &&
					prompt.slug.trim().length > 0,
			);

			if (validPrompts.length > 0) {
				const prompt = validPrompts[0];

				// Record how many valid prompts were present when more than one exists
				if (validPrompts.length > 1) {
					attributes["basalt.prompts.count"] = validPrompts.length;
				}

				attributes["basalt.prompt.slug"] = prompt.slug;

				if (prompt.version) {
					attributes["basalt.prompt.version"] = prompt.version;
				}

				if (prompt.tag) {
					attributes["basalt.prompt.tag"] = prompt.tag;
				}

				if (prompt.model?.provider) {
					attributes["basalt.prompt.model.provider"] = prompt.model.provider;
				}

				if (prompt.model?.model) {
					attributes["basalt.prompt.model.model"] = prompt.model.model;
				}

				if (prompt.variables && Object.keys(prompt.variables).length > 0) {
					try {
						attributes["basalt.prompt.variables"] = JSON.stringify(
							prompt.variables,
						);
					} catch {
						attributes["basalt.prompt.variables"] = "[Serialization Error]";
					}
				}

				attributes["basalt.prompt.from_cache"] = prompt.fromCache;
			}
		}

		return attributes;
	}

	/**
	 * Merge new context with existing context
	 * Useful for updating context without losing existing values
	 *
	 * @param updates - Partial context to merge
	 */
	export function mergeContext(
		updates: Partial<BasaltContext>,
	): Context | undefined {
		const existing = getContext() || {};

		// Merge evaluators: combine arrays and deduplicate
		let mergedEvaluators: string[] | undefined;
		if (updates.evaluators || existing.evaluators) {
			const existingEvals = existing.evaluators || [];
			const newEvals = updates.evaluators || [];
			const combined = [...existingEvals, ...newEvals];
			const deduplicated = Array.from(new Set(combined));
			mergedEvaluators = deduplicated.length > 0 ? deduplicated : undefined;
		}

		// Merge evaluation config
		const mergedEvalConfig =
			updates.evaluationConfig || existing.evaluationConfig
				? { ...existing.evaluationConfig, ...updates.evaluationConfig }
				: undefined;

		// Merge prompts: override by slug
		let mergedPrompts: PromptMetadata[] | undefined;
		if (updates.prompts || existing.prompts) {
			const existingPrompts = existing.prompts || [];
			const newPrompts = updates.prompts || [];

			const promptMap = new Map<string, PromptMetadata>();

			for (const prompt of existingPrompts) {
				if (prompt?.slug && prompt.slug.trim().length > 0) {
					promptMap.set(prompt.slug, prompt);
				}
			}

			for (const prompt of newPrompts) {
				if (prompt?.slug && prompt.slug.trim().length > 0) {
					promptMap.set(prompt.slug, prompt);
				}
			}

			const combined = Array.from(promptMap.values());
			mergedPrompts = combined.length > 0 ? combined : undefined;
		}

		const merged: BasaltContext = {
			...existing,
			...updates,
			// Deep merge user, organization, experiment
			user: updates.user
				? { ...existing.user, ...updates.user }
				: existing.user,
			organization: updates.organization
				? { ...existing.organization, ...updates.organization }
				: existing.organization,
			experiment_id: updates.experiment_id ?? existing.experiment_id,
			metadata: updates.metadata
				? { ...existing.metadata, ...updates.metadata }
				: existing.metadata,
			evaluators: mergedEvaluators,
			evaluationConfig: mergedEvalConfig,
			prompts: mergedPrompts,
		};

		return setContext(merged);
	}

	/**
	 * Execute a function within a Basalt context that is merged into the current one.
	 * This is the recommended way to "mutate" context safely across async boundaries.
	 */
	export function withMergedContext<T>(
		updates: Partial<BasaltContext>,
		fn: () => T,
	): T {
		try {
			const otel = require("@opentelemetry/api");
			const currentContext = otel.context.active();
			const existing = currentContext.getValue(BASALT_CONTEXT_KEY) as
				| BasaltContext
				| undefined;

			// Merge evaluators: combine and deduplicate
			let mergedEvaluators: string[] | undefined;
			if (updates.evaluators || existing?.evaluators) {
				const existingEvals = existing?.evaluators || [];
				const newEvals = updates.evaluators || [];
				const combined = [...existingEvals, ...newEvals];
				const deduplicated = Array.from(new Set(combined));
				mergedEvaluators = deduplicated.length > 0 ? deduplicated : undefined;
			}

			// Merge evaluation config
			const mergedEvalConfig =
				updates.evaluationConfig || existing?.evaluationConfig
					? {
							...(existing?.evaluationConfig ?? {}),
							...updates.evaluationConfig,
						}
					: undefined;

			const mergePromptsBySlug = (
				existingPrompts: PromptMetadata[] | undefined,
				newPrompts: PromptMetadata[] | undefined,
			): PromptMetadata[] | undefined => {
				const basePrompts = existingPrompts || [];
				const additionalPrompts = newPrompts || [];

				if (basePrompts.length === 0 && additionalPrompts.length === 0) {
					return undefined;
				}

				const promptMap = new Map<string, PromptMetadata>();

				for (const prompt of basePrompts) {
					if (prompt?.slug && prompt.slug.trim().length > 0) {
						promptMap.set(prompt.slug, prompt);
					}
				}

				for (const prompt of additionalPrompts) {
					if (prompt?.slug && prompt.slug.trim().length > 0) {
						promptMap.set(prompt.slug, prompt);
					}
				}

				const combined = Array.from(promptMap.values());
				return combined.length > 0 ? combined : undefined;
			};

			// Merge prompts: override by slug
			const mergedPrompts = mergePromptsBySlug(
				existing?.prompts,
				updates.prompts,
			);
			const merged: BasaltContext = {
				...(existing ?? {}),
				...updates,
				user: updates.user
					? { ...(existing?.user ?? {}), ...updates.user }
					: existing?.user,
				organization: updates.organization
					? { ...(existing?.organization ?? {}), ...updates.organization }
					: existing?.organization,
				experiment_id: updates.experiment_id ?? existing?.experiment_id,
				metadata: updates.metadata
					? { ...(existing?.metadata ?? {}), ...updates.metadata }
					: existing?.metadata,
				evaluators: mergedEvaluators,
				evaluationConfig: mergedEvalConfig,
				prompts: mergedPrompts,
			};

			const newContext = currentContext.setValue(BASALT_CONTEXT_KEY, merged);
			return otel.context.with(newContext, fn);
		} catch {
			return fn();
		}
	}

	/**
	 * Set root span handle in the OpenTelemetry context
	 * Returns a new context with the root span handle attached
	 *
	 * @param handle - Root span handle to store
	 * @param ctx - Optional context to use (defaults to active context)
	 */
	export function setRootSpan(
		handle: StartSpanHandle,
		ctx?: Context,
	): Context | undefined {
		try {
			const otel = require("@opentelemetry/api");
			const activeContext = ctx ?? otel.context.active();
			return activeContext.setValue(BASALT_ROOT_SPAN, handle);
		} catch {
			return undefined;
		}
	}

	/**
	 * Get root span handle from the OpenTelemetry context
	 *
	 * @param ctx - Optional context to use (defaults to active context)
	 * @returns The root span handle if available
	 */
	export function getRootSpan(ctx?: Context): StartSpanHandle | undefined {
		try {
			const otel = require("@opentelemetry/api");
			const activeContext = ctx ?? otel.context.active();
			return activeContext.getValue(BASALT_ROOT_SPAN) as
				| StartSpanHandle
				| undefined;
		} catch {
			return undefined;
		}
	}

	/**
	 * Execute a function within a context that has a root span handle
	 * The root span handle will be available to all nested operations
	 * Also sets the span as the active OpenTelemetry span
	 *
	 * @param handle - Root span handle to use
	 * @param fn - Function to execute
	 */
	export function withRootSpan<T>(handle: StartSpanHandle, fn: () => T): T {
		try {
			const otel = require("@opentelemetry/api");
			const runWithRoot = () => {
				const currentContext = otel.context.active();
				// Store handle in Basalt context
				let newContext = currentContext.setValue(BASALT_ROOT_SPAN, handle);
				// Also set as active OpenTelemetry span so child spans connect properly
				newContext = otel.trace.setSpan(newContext, handle.getSpan());
				return otel.context.with(newContext, fn);
			};

			const basaltContext = handle.getBasaltContext?.();
			if (basaltContext && Object.keys(basaltContext).length > 0) {
				return withMergedContext(basaltContext, runWithRoot);
			}

			return runWithRoot();
		} catch {
			// If OTel not available, just execute the function
			return fn();
		}
	}
}
