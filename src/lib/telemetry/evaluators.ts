import { BasaltContextManager } from "./context-manager";
import type { BasaltContext } from "./types";

/**
 * Execute a function with evaluators attached to all spans created within the callback.
 * Evaluators are merged with any existing evaluators in the parent context.
 *
 * Supports both synchronous and asynchronous callbacks.
 *
 * @example
 * ```typescript
 * // Async callback
 * const result = await withEvaluators(
 *   ["hallucinations", "clarity"],
 *   async () => {
 *     // All auto-instrumented spans here will have these evaluators
 *     const response = await openai.chat.completions.create({...});
 *     return response;
 *   }
 * );
 *
 * // Sync callback
 * const result = withEvaluators(
 *   ["quality"],
 *   () => {
 *     return processData();
 *   }
 * );
 *
 * // With evaluation config
 * const result = await withEvaluators(
 *   ["toxicity"],
 *   async () => { ... },
 * );
 * ```
 *
 * @param evaluators - Array of evaluator slugs to attach
 * @param fn - Callback function to execute (sync or async)
 * @returns The result of the callback function
 */
export function withEvaluators<T>(evaluators: string[], fn: () => T): T {
	// Validate evaluators array
	if (!Array.isArray(evaluators)) {
		return fn();
	}

	// Filter valid evaluators
	const validEvaluators = evaluators.filter(
		(e) => e && typeof e === "string" && e.trim().length > 0,
	);

	// Build context updates
	const contextUpdates: Partial<BasaltContext> = {};

	if (validEvaluators.length > 0) {
		contextUpdates.evaluators = validEvaluators;
	}

	// Use withMergedContext which handles merging evaluators
	return BasaltContextManager.withMergedContext(contextUpdates, fn);
}

/**
 * Convenience function to attach a single evaluator to all spans within a callback.
 * Equivalent to `withEvaluators([evaluator], fn)`.
 *
 * @example
 * ```typescript
 * const result = await attachEvaluator(
 *   "quality-check",
 *   async () => {
 *     const response = await openai.chat.completions.create({...});
 *     return response;
 *   }
 * );
 *
 * // With evaluation config
 * const result = await attachEvaluator(
 *   "toxicity",
 *   async () => { ... },
 * );
 * ```
 *
 * @param evaluator - Single evaluator slug to attach
 * @param fn - Callback function to execute (sync or async)
 * @returns The result of the callback function
 */
export function attachEvaluator<T>(evaluator: string, fn: () => T): T {
	return withEvaluators([evaluator], fn);
}
