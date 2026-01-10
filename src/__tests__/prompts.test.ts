/**
 * Tests for prompts API (withPrompt and withPrompts)
 */

// Mock OpenTelemetry API before any imports
jest.mock("@opentelemetry/api", () => {
	const createMockContext = () => {
		const store = new Map();
		return {
			getValue: (key: symbol) => store.get(key),
			setValue: (key: symbol, value: unknown) => {
				const newContext = createMockContext();
				// Copy existing values
				store.forEach((v, k) => newContext.setValue(k, v));
				// Set new value
				(newContext as any).store.set(key, value);
				return newContext;
			},
			deleteValue: (key: symbol) => {
				const newContext = createMockContext();
				store.forEach((v, k) => {
					if (k !== key) newContext.setValue(k, v);
				});
				return newContext;
			},
			store,
		};
	};

	let activeContext = createMockContext();

	return {
		context: {
			active: () => activeContext,
			with: (ctx: any, fn: () => any) => {
				const previousContext = activeContext;
				activeContext = ctx;
				try {
					return fn();
				} finally {
					activeContext = previousContext;
				}
			},
		},
		trace: {
			getTracer: jest.fn(),
		},
	};
});

import type { PromptResponse } from "../lib/resources";
import { BasaltContextManager } from "../lib/telemetry/context-manager";
import {
	attachPromptMetadata,
	type PromptContextMetadata,
} from "../lib/telemetry/prompt-metadata";
import { withPrompt, withPrompts } from "../lib/telemetry/prompts";

const defaultModel = {
	provider: "anthropic",
	model: "3.5-sonnet",
	version: "latest",
	parameters: {
		temperature: 0.1,
		topP: 1,
		maxLength: 256,
		responseFormat: "text",
	},
} as const;

const makePromptResponse = (
	overrides?: Partial<PromptResponse>,
): PromptResponse => {
	const { model: modelOverrides, ...rest } = overrides ?? {};
	return {
		text: "Hello there",
		systemText: undefined,
		model: {
			...defaultModel,
			...(modelOverrides ?? {}),
		},
		...rest,
	};
};

const withPromptMetadata = (
	prompt: PromptResponse,
	metadata: PromptContextMetadata,
): PromptResponse => attachPromptMetadata(prompt, metadata);

describe("withPrompt", () => {
	it("should execute callback with prompt metadata", () => {
		const promptResponse = withPromptMetadata(makePromptResponse(), {
			slug: "qa-prompt",
			version: "1.2.0",
			tag: "production",
			variables: { query: "hello" },
			fromCache: true,
		});

		const result = withPrompt(promptResponse, () => {
			const ctx = BasaltContextManager.getContext();
			expect(ctx?.prompts).toHaveLength(1);
			expect(ctx?.prompts?.[0]).toMatchObject({
				slug: "qa-prompt",
				version: "1.2.0",
				tag: "production",
				variables: { query: "hello" },
				model: {
					provider: "anthropic",
					model: "3.5-sonnet",
				},
				fromCache: true,
			});
			return "success";
		});

		expect(result).toBe("success");
	});

	it("should support async callbacks", async () => {
		const promptResponse = withPromptMetadata(makePromptResponse(), {
			slug: "async-prompt",
			fromCache: false,
		});

		const result = await withPrompt(promptResponse, async () => {
			const ctx = BasaltContextManager.getContext();
			expect(ctx?.prompts?.[0]?.slug).toBe("async-prompt");
			await new Promise((resolve) => setTimeout(resolve, 10));
			return "async-success";
		});

		expect(result).toBe("async-success");
	});

	it("should merge prompts in nested calls", () => {
		const promptA = withPromptMetadata(makePromptResponse(), {
			slug: "prompt-a",
			fromCache: false,
		});
		const promptB = withPromptMetadata(
			makePromptResponse({
				model: {
					...defaultModel,
					model: "3-haiku",
				},
			}),
			{
				slug: "prompt-b",
				fromCache: true,
			},
		);

		withPrompt(promptA, () => {
			withPrompt(promptB, () => {
				const ctx = BasaltContextManager.getContext();
				expect(ctx?.prompts?.map((prompt) => prompt.slug)).toEqual([
					"prompt-a",
					"prompt-b",
				]);
			});
		});
	});

	it("should override prompts by slug in nested calls", () => {
		const promptA = withPromptMetadata(makePromptResponse(), {
			slug: "prompt-a",
			version: "1",
			fromCache: false,
		});
		const promptB = withPromptMetadata(
			makePromptResponse({
				model: {
					...defaultModel,
					model: "3-haiku",
				},
			}),
			{
				slug: "prompt-a",
				version: "2",
				fromCache: true,
			},
		);

		withPrompt(promptA, () => {
			withPrompt(promptB, () => {
				const ctx = BasaltContextManager.getContext();
				expect(ctx?.prompts).toHaveLength(1);
				expect(ctx?.prompts?.[0]).toMatchObject({
					slug: "prompt-a",
					version: "2",
					fromCache: true,
				});
			});
		});
	});

	it("should preserve first occurrence order when overriding", () => {
		const promptA = withPromptMetadata(makePromptResponse(), {
			slug: "prompt-a",
			version: "1",
			fromCache: false,
		});
		const promptB = withPromptMetadata(
			makePromptResponse({
				model: {
					...defaultModel,
					model: "3-haiku",
				},
			}),
			{
				slug: "prompt-b",
				fromCache: false,
			},
		);
		const promptC = withPromptMetadata(
			makePromptResponse({
				model: {
					...defaultModel,
					model: "3-sonnet",
				},
			}),
			{
				slug: "prompt-a",
				version: "2",
				fromCache: true,
			},
		);

		withPrompt(promptA, () => {
			withPrompt(promptB, () => {
				withPrompt(promptC, () => {
					const ctx = BasaltContextManager.getContext();
					expect(ctx?.prompts?.map((prompt) => prompt.slug)).toEqual([
						"prompt-a",
						"prompt-b",
					]);
					expect(ctx?.prompts?.[0]?.version).toBe("2");
				});
			});
		});
	});

	it("should handle invalid prompt data", () => {
		const result = withPrompt(undefined as unknown as PromptResponse, () => {
			const ctx = BasaltContextManager.getContext();
			expect(ctx?.prompts).toBeUndefined();
			return "success";
		});
		expect(result).toBe("success");
	});

	it("should clean up context after callback", () => {
		const promptResponse = withPromptMetadata(makePromptResponse(), {
			slug: "cleanup",
			fromCache: false,
		});

		withPrompt(promptResponse, () => {
			const ctx = BasaltContextManager.getContext();
			expect(ctx?.prompts?.[0]?.slug).toBe("cleanup");
		});

		const ctxAfter = BasaltContextManager.getContext();
		expect(ctxAfter?.prompts).toBeUndefined();
	});

	it("should return callback result", () => {
		const promptResponse = withPromptMetadata(makePromptResponse(), {
			slug: "result",
			fromCache: true,
		});
		const obj = { value: 42 };

		const result = withPrompt(promptResponse, () => obj);

		expect(result).toBe(obj);
	});

	it("should propagate errors from callback", () => {
		const promptResponse = withPromptMetadata(makePromptResponse(), {
			slug: "error",
			fromCache: false,
		});

		expect(() => {
			withPrompt(promptResponse, () => {
				throw new Error("Test error");
			});
		}).toThrow("Test error");
	});

	it("should handle async errors", async () => {
		const promptResponse = withPromptMetadata(makePromptResponse(), {
			slug: "error-async",
			fromCache: false,
		});

		await expect(
			withPrompt(promptResponse, async () => {
				throw new Error("Async error");
			}),
		).rejects.toThrow("Async error");
	});
});

describe("withPrompts", () => {
	it("should execute callback with multiple prompts", () => {
		const promptA = withPromptMetadata(makePromptResponse(), {
			slug: "prompt-a",
			fromCache: false,
		});
		const promptB = withPromptMetadata(
			makePromptResponse({
				model: {
					...defaultModel,
					model: "3-haiku",
				},
			}),
			{
				slug: "prompt-b",
				fromCache: true,
			},
		);

		const result = withPrompts([promptA, promptB], () => {
			const ctx = BasaltContextManager.getContext();
			expect(ctx?.prompts?.map((prompt) => prompt.slug)).toEqual([
				"prompt-a",
				"prompt-b",
			]);
			return "success";
		});

		expect(result).toBe("success");
	});

	it("should override by slug within the same call", () => {
		const promptA = withPromptMetadata(makePromptResponse(), {
			slug: "prompt-a",
			version: "1",
			fromCache: false,
		});
		const promptB = withPromptMetadata(
			makePromptResponse({
				model: {
					...defaultModel,
					model: "3-haiku",
				},
			}),
			{
				slug: "prompt-a",
				version: "2",
				fromCache: true,
			},
		);

		withPrompts([promptA, promptB], () => {
			const ctx = BasaltContextManager.getContext();
			expect(ctx?.prompts).toHaveLength(1);
			expect(ctx?.prompts?.[0]).toMatchObject({
				slug: "prompt-a",
				version: "2",
				fromCache: true,
			});
		});
	});

	it("should support async callbacks", async () => {
		const promptA = withPromptMetadata(makePromptResponse(), {
			slug: "prompt-a",
			fromCache: false,
		});

		const result = await withPrompts([promptA], async () => {
			const ctx = BasaltContextManager.getContext();
			expect(ctx?.prompts?.[0]?.slug).toBe("prompt-a");
			await new Promise((resolve) => setTimeout(resolve, 10));
			return "async-success";
		});

		expect(result).toBe("async-success");
	});

	it("should merge with parent prompts", () => {
		const promptA = withPromptMetadata(makePromptResponse(), {
			slug: "parent",
			fromCache: false,
		});
		const promptB = withPromptMetadata(
			makePromptResponse({
				model: {
					...defaultModel,
					model: "3-haiku",
				},
			}),
			{
				slug: "child",
				fromCache: true,
			},
		);

		withPrompt(promptA, () => {
			withPrompts([promptB], () => {
				const ctx = BasaltContextManager.getContext();
				expect(ctx?.prompts?.map((prompt) => prompt.slug)).toEqual([
					"parent",
					"child",
				]);
			});
		});
	});

	it("should handle empty prompt array", () => {
		const result = withPrompts([], () => {
			const ctx = BasaltContextManager.getContext();
			expect(ctx?.prompts).toBeUndefined();
			return "success";
		});

		expect(result).toBe("success");
	});

	it("should handle invalid prompt array", () => {
		const result = withPrompts("not-an-array" as unknown as never[], () => {
			const ctx = BasaltContextManager.getContext();
			expect(ctx?.prompts).toBeUndefined();
			return "success";
		});

		expect(result).toBe("success");
	});
});

describe("Prompt attribute extraction", () => {
	it("should extract all prompt attributes correctly", () => {
		const promptResponse = withPromptMetadata(makePromptResponse(), {
			slug: "test-prompt",
			version: "1.0.0",
			tag: "production",
			variables: { query: "hello", context: "world" },
			fromCache: true,
		});

		withPrompt(promptResponse, () => {
			const attrs = BasaltContextManager.extractAttributes();

			expect(attrs["basalt.prompt.slug"]).toBe("test-prompt");
			expect(attrs["basalt.prompt.version"]).toBe("1.0.0");
			expect(attrs["basalt.prompt.tag"]).toBe("production");
			expect(attrs["basalt.prompt.model.provider"]).toBe("anthropic");
			expect(attrs["basalt.prompt.model.model"]).toBe("3.5-sonnet");
			expect(attrs["basalt.prompt.variables"]).toBe(
				JSON.stringify({ query: "hello", context: "world" }),
			);
			expect(attrs["basalt.prompt.from_cache"]).toBe(true);
		});
	});

	it("should extract minimal prompt attributes when optional fields are missing", () => {
		const promptResponse = withPromptMetadata(
			makePromptResponse({
				model: {
					...defaultModel,
					model: "3-haiku",
				},
			}),
			{
				slug: "minimal-prompt",
				fromCache: false,
			},
		);

		withPrompt(promptResponse, () => {
			const attrs = BasaltContextManager.extractAttributes();

			expect(attrs["basalt.prompt.slug"]).toBe("minimal-prompt");
			expect(attrs["basalt.prompt.from_cache"]).toBe(false);
			expect(attrs["basalt.prompt.model.provider"]).toBe("anthropic");
			expect(attrs["basalt.prompt.model.model"]).toBe("3-haiku");
			expect(attrs["basalt.prompt.version"]).toBeUndefined();
			expect(attrs["basalt.prompt.tag"]).toBeUndefined();
			expect(attrs["basalt.prompt.variables"]).toBeUndefined();
		});
	});

	it("should not add prompt attributes if no prompts in context", () => {
		const attrs = BasaltContextManager.extractAttributes();

		expect(attrs["basalt.prompt.slug"]).toBeUndefined();
		expect(attrs["basalt.prompt.version"]).toBeUndefined();
		expect(attrs["basalt.prompt.tag"]).toBeUndefined();
		expect(attrs["basalt.prompt.model.provider"]).toBeUndefined();
		expect(attrs["basalt.prompt.model.model"]).toBeUndefined();
		expect(attrs["basalt.prompt.variables"]).toBeUndefined();
		expect(attrs["basalt.prompt.from_cache"]).toBeUndefined();
	});

	it("should use first valid prompt when multiple prompts exist", () => {
		const promptA = withPromptMetadata(makePromptResponse(), {
			slug: "prompt-a",
			version: "1.0.0",
			tag: "staging",
			fromCache: false,
		});
		const promptB = withPromptMetadata(
			makePromptResponse({
				model: {
					...defaultModel,
					model: "3-opus",
				},
			}),
			{
				slug: "prompt-b",
				version: "2.0.0",
				tag: "production",
				fromCache: true,
			},
		);

		withPrompts([promptA, promptB], () => {
			const attrs = BasaltContextManager.extractAttributes();

			// Should use first prompt (prompt-a)
			expect(attrs["basalt.prompt.slug"]).toBe("prompt-a");
			expect(attrs["basalt.prompt.version"]).toBe("1.0.0");
			expect(attrs["basalt.prompt.tag"]).toBe("staging");
			expect(attrs["basalt.prompt.from_cache"]).toBe(false);
			expect(attrs["basalt.prompts.count"]).toBe(2);
		});
	});

	it("should not add prompts.count when only one prompt exists", () => {
		const promptResponse = withPromptMetadata(makePromptResponse(), {
			slug: "single-prompt",
			fromCache: false,
		});

		withPrompt(promptResponse, () => {
			const attrs = BasaltContextManager.extractAttributes();

			expect(attrs["basalt.prompt.slug"]).toBe("single-prompt");
			expect(attrs["basalt.prompts.count"]).toBeUndefined();
		});
	});

	it("should handle variables serialization error gracefully", () => {
		const circularRef: Record<string, unknown> = { key: "value" };
		circularRef.circular = circularRef;

		const promptResponse = withPromptMetadata(makePromptResponse(), {
			slug: "circular-vars",
			variables: circularRef,
			fromCache: false,
		});

		withPrompt(promptResponse, () => {
			const attrs = BasaltContextManager.extractAttributes();

			expect(attrs["basalt.prompt.slug"]).toBe("circular-vars");
			expect(attrs["basalt.prompt.variables"]).toBe("[Serialization Error]");
		});
	});

	it("should not include variables attribute when variables object is empty", () => {
		const promptResponse = withPromptMetadata(makePromptResponse(), {
			slug: "no-vars",
			variables: {},
			fromCache: false,
		});

		withPrompt(promptResponse, () => {
			const attrs = BasaltContextManager.extractAttributes();

			expect(attrs["basalt.prompt.slug"]).toBe("no-vars");
			expect(attrs["basalt.prompt.variables"]).toBeUndefined();
		});
	});

	it("should extract correct provider and model from different model configs", () => {
		const promptResponse = withPromptMetadata(
			makePromptResponse({
				model: {
					...defaultModel,
					provider: "openai",
					model: "gpt-4",
				},
			}),
			{
				slug: "openai-prompt",
				fromCache: true,
			},
		);

		withPrompt(promptResponse, () => {
			const attrs = BasaltContextManager.extractAttributes();

			expect(attrs["basalt.prompt.model.provider"]).toBe("openai");
			expect(attrs["basalt.prompt.model.model"]).toBe("gpt-4");
		});
	});

	it("should default to 'unknown' for missing model fields", () => {
		// Create a prompt response where model fields are missing
		const promptResponseWithoutModel = {
			text: "Hello there",
			systemText: undefined,
			model: undefined as unknown as typeof defaultModel,
		} as PromptResponse;

		const promptResponse = withPromptMetadata(promptResponseWithoutModel, {
			slug: "no-model",
			fromCache: false,
		});

		withPrompt(promptResponse, () => {
			const attrs = BasaltContextManager.extractAttributes();

			expect(attrs["basalt.prompt.slug"]).toBe("no-model");
			// When model is missing, buildPromptMetadata defaults to "unknown"
			expect(attrs["basalt.prompt.model.provider"]).toBe("unknown");
			expect(attrs["basalt.prompt.model.model"]).toBe("unknown");
		});
	});

	it("should handle fromCache boolean correctly", () => {
		const cachedPrompt = withPromptMetadata(makePromptResponse(), {
			slug: "cached",
			fromCache: true,
		});

		withPrompt(cachedPrompt, () => {
			const attrs = BasaltContextManager.extractAttributes();
			expect(attrs["basalt.prompt.from_cache"]).toBe(true);
		});

		const notCachedPrompt = withPromptMetadata(makePromptResponse(), {
			slug: "not-cached",
			fromCache: false,
		});

		withPrompt(notCachedPrompt, () => {
			const attrs = BasaltContextManager.extractAttributes();
			expect(attrs["basalt.prompt.from_cache"]).toBe(false);
		});
	});
});
