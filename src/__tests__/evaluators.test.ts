/**
 * Tests for evaluators API (withEvaluators and attachEvaluator)
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

import { BasaltContextManager } from "../lib/telemetry/context-manager";
import { attachEvaluator, withEvaluators } from "../lib/telemetry/evaluators";

describe("withEvaluators", () => {
	it("should execute callback with single evaluator", () => {
		const result = withEvaluators(["hallucinations"], () => {
			const ctx = BasaltContextManager.getContext();
			expect(ctx?.evaluators).toEqual(["hallucinations"]);
			return "success";
		});
		expect(result).toBe("success");
	});

	it("should execute callback with multiple evaluators", () => {
		const result = withEvaluators(
			["hallucinations", "clarity", "toxicity"],
			() => {
				const ctx = BasaltContextManager.getContext();
				expect(ctx?.evaluators).toEqual([
					"hallucinations",
					"clarity",
					"toxicity",
				]);
				return "success";
			},
		);
		expect(result).toBe("success");
	});

	it("should support async callbacks", async () => {
		const result = await withEvaluators(["quality"], async () => {
			const ctx = BasaltContextManager.getContext();
			expect(ctx?.evaluators).toEqual(["quality"]);
			await new Promise((resolve) => setTimeout(resolve, 10));
			return "async-success";
		});
		expect(result).toBe("async-success");
	});

	it("should merge evaluators in nested calls", () => {
		withEvaluators(["quality", "safety"], () => {
			const ctx1 = BasaltContextManager.getContext();
			expect(ctx1?.evaluators).toEqual(["quality", "safety"]);

			withEvaluators(["toxicity", "bias"], () => {
				const ctx2 = BasaltContextManager.getContext();
				// Should merge and maintain order
				expect(ctx2?.evaluators).toContain("quality");
				expect(ctx2?.evaluators).toContain("safety");
				expect(ctx2?.evaluators).toContain("toxicity");
				expect(ctx2?.evaluators).toContain("bias");
			});
		});
	});

	it("should deduplicate evaluators in nested calls", () => {
		withEvaluators(["quality", "toxicity"], () => {
			withEvaluators(["quality", "clarity"], () => {
				const ctx = BasaltContextManager.getContext();
				// "quality" should only appear once
				const qualityCount = ctx?.evaluators?.filter(
					(e) => e === "quality",
				).length;
				expect(qualityCount).toBe(1);
				expect(ctx?.evaluators).toContain("quality");
				expect(ctx?.evaluators).toContain("toxicity");
				expect(ctx?.evaluators).toContain("clarity");
			});
		});
	});

	it("should handle empty evaluator array", () => {
		const result = withEvaluators([], () => {
			const ctx = BasaltContextManager.getContext();
			// Context might not have evaluators or might have undefined
			expect(ctx?.evaluators).toBeUndefined();
			return "success";
		});
		expect(result).toBe("success");
	});

	it("should filter out invalid evaluators", () => {
		const result = withEvaluators(
			["valid", "", null as unknown as string, "   ", "another-valid"],
			() => {
				const ctx = BasaltContextManager.getContext();
				expect(ctx?.evaluators).toEqual(["valid", "another-valid"]);
				return "success";
			},
		);
		expect(result).toBe("success");
	});

	it("should handle non-array evaluators gracefully", () => {
		const result = withEvaluators("not-an-array" as unknown as string[], () => {
			// Should just execute without error
			return "success";
		});
		expect(result).toBe("success");
	});

	it("should support evaluation config", () => {
		const result = withEvaluators(
			["quality"],
			() => {
				const ctx = BasaltContextManager.getContext();
				expect(ctx?.evaluators).toEqual(["quality"]);
				return "success";
			},
		);
		expect(result).toBe("success");
	});


	it("should clean up context after callback", () => {
		withEvaluators(["quality"], () => {
			const ctx = BasaltContextManager.getContext();
			expect(ctx?.evaluators).toEqual(["quality"]);
		});

		// After callback, context should not have evaluators
		const ctxAfter = BasaltContextManager.getContext();
		expect(ctxAfter?.evaluators).toBeUndefined();
	});

	it("should return callback result", () => {
		const obj = { value: 42 };
		const result = withEvaluators(["test"], () => obj);
		expect(result).toBe(obj);
	});

	it("should propagate errors from callback", () => {
		expect(() => {
			withEvaluators(["test"], () => {
				throw new Error("Test error");
			});
		}).toThrow("Test error");
	});

	it("should handle async errors", async () => {
		await expect(
			withEvaluators(["test"], async () => {
				throw new Error("Async error");
			}),
		).rejects.toThrow("Async error");
	});
});

describe("attachEvaluator", () => {
	it("should execute callback with single evaluator", () => {
		const result = attachEvaluator("quality-check", () => {
			const ctx = BasaltContextManager.getContext();
			expect(ctx?.evaluators).toEqual(["quality-check"]);
			return "success";
		});
		expect(result).toBe("success");
	});

	it("should support async callbacks", async () => {
		const result = await attachEvaluator("toxicity", async () => {
			const ctx = BasaltContextManager.getContext();
			expect(ctx?.evaluators).toEqual(["toxicity"]);
			await new Promise((resolve) => setTimeout(resolve, 10));
			return "async-success";
		});
		expect(result).toBe("async-success");
	});

	it("should support evaluation config", () => {
		const result = attachEvaluator(
			"quality",
			() => {
				const ctx = BasaltContextManager.getContext();
				expect(ctx?.evaluators).toEqual(["quality"]);
				return "success";
			},
		);
		expect(result).toBe("success");
	});

	it("should be equivalent to withEvaluators with single item array", () => {
		const evaluatorSlug = "test-evaluator";

		let resultFromWith: string | undefined;
		let resultFromAttach: string | undefined;

		withEvaluators([evaluatorSlug], () => {
			const ctx = BasaltContextManager.getContext();
			resultFromWith = ctx?.evaluators?.[0];
		});

		attachEvaluator(evaluatorSlug, () => {
			const ctx = BasaltContextManager.getContext();
			resultFromAttach = ctx?.evaluators?.[0];
		});

		expect(resultFromWith).toBe(resultFromAttach);
		expect(resultFromWith).toBe(evaluatorSlug);
	});

	it("should merge with parent evaluators", () => {
		withEvaluators(["parent-eval"], () => {
			attachEvaluator("child-eval", () => {
				const ctx = BasaltContextManager.getContext();
				expect(ctx?.evaluators).toContain("parent-eval");
				expect(ctx?.evaluators).toContain("child-eval");
			});
		});
	});
});

describe("Context attribute extraction", () => {
	it("should extract evaluators as JSON array attribute", () => {
		withEvaluators(["eval1", "eval2"], () => {
			const attrs = BasaltContextManager.extractAttributes();
			expect(attrs["basalt.span.evaluators"]).toBe(
				JSON.stringify(["eval1", "eval2"]),
			);
		});
	});


	it("should not add evaluator attributes if no evaluators", () => {
		const attrs = BasaltContextManager.extractAttributes();
		expect(attrs["basalt.span.evaluators"]).toBeUndefined();
	});

	it("should not add sample rate if not provided", () => {
		withEvaluators(["eval1"], () => {
			const attrs = BasaltContextManager.extractAttributes();
			expect(attrs["basalt.span.evaluation.sample_rate"]).toBeUndefined();
		});
	});
});
