import { BasaltContextManager } from "./context-manager";
import { getPromptMetadata, type PromptContextMetadata } from "./prompt-metadata";
import type { BasaltContext, PromptMetadata } from "./types";
import type { PromptResponse } from "../resources";

type PromptMetadataInput = PromptContextMetadata;

function buildPromptMetadata(
	promptResponse: PromptResponse,
	metadata: PromptMetadataInput | undefined,
): PromptMetadata | undefined {
	if (!promptResponse || !metadata?.slug) {
		return undefined;
	}

	const provider = promptResponse.model?.provider ?? "unknown";
	const model = promptResponse.model?.model ?? "unknown";

	return {
		slug: metadata.slug,
		version: metadata.version,
		tag: metadata.tag,
		variables: metadata.variables,
		model: {
			provider,
			model,
		},
		fromCache: metadata.fromCache,
	};
}

/**
 * Execute a function with a prompt attached to all spans created within the callback.
 * Prompt metadata will be merged with any existing prompts in the parent context.
 * If a prompt with the same slug already exists, it will be overridden.
 * Metadata is read from the prompt response; if missing, the callback runs as-is.
 *
 * Supports both synchronous and asynchronous callbacks.
 *
 * @example
 * ```typescript
 * // Async callback
 * const prompt = await basalt.prompts.get("qa-prompt", { query: "..." });
 * const result = await withPrompt(prompt, async () => {
 *   // All auto-instrumented LLM spans here will have prompt attributes
 *   const response = await openai.chat.completions.create({
 *     model: prompt.model,
 *     messages: [{ role: "user", content: prompt.text }]
 *   });
 *   return response;
 * });
 *
 * // Sync callback
 * const result = withPrompt(prompt, () => {
 *   return processGreeting();
 * });
 * ```
 *
 * @param promptResponse - The prompt response from prompts.get()
 * @param fn - Callback function to execute (sync or async)
 * @returns The result of the callback function
 */
export function withPrompt<T>(promptResponse: PromptResponse, fn: () => T): T {
	const promptMetadata = buildPromptMetadata(
		promptResponse,
		getPromptMetadata(promptResponse),
	);
	if (!promptMetadata) {
		return fn();
	}

	const contextUpdates: Partial<BasaltContext> = {
		prompts: [promptMetadata],
	};

	return BasaltContextManager.withMergedContext(contextUpdates, fn);
}

/**
 * Convenience function to attach multiple prompts to all spans within a callback.
 * Useful when you want to track multiple prompts in a single operation.
 *
 * @example
 * ```typescript
 * const prompts = await Promise.all([
 *   basalt.prompts.get("system-prompt"),
 *   basalt.prompts.get("user-prompt", { query })
 * ]);
 *
 * const result = await withPrompts(prompts, async () => {
 *   // LLM calls here get both prompt attributes
 *   return await callLLM();
 * });
 * ```
 *
 * @param prompts - Array of prompt responses
 * @param fn - Callback function to execute (sync or async)
 * @returns The result of the callback function
 */
export function withPrompts<T>(prompts: PromptResponse[], fn: () => T): T {
	if (!Array.isArray(prompts) || prompts.length === 0) {
		return fn();
	}

	const promptsMetadata: PromptMetadata[] = [];

	for (const prompt of prompts) {
		const promptMetadata = buildPromptMetadata(
			prompt,
			getPromptMetadata(prompt),
		);
		if (promptMetadata) {
			promptsMetadata.push(promptMetadata);
		}
	}

	if (promptsMetadata.length === 0) {
		return fn();
	}

	const contextUpdates: Partial<BasaltContext> = {
		prompts: promptsMetadata,
	};

	return BasaltContextManager.withMergedContext(contextUpdates, fn);
}
