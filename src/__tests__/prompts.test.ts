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
		const result = withPrompt(
			undefined as unknown as PromptResponse,
			() => {
				const ctx = BasaltContextManager.getContext();
				expect(ctx?.prompts).toBeUndefined();
				return "success";
			},
		);
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
