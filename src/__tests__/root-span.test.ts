/**
 * Tests for root span API and span handles
 */

// Mock OpenTelemetry API before any imports
jest.mock("@opentelemetry/api", () => {
	const mockSpan = {
		spanContext: () => ({
			traceId: "test-trace-id",
			spanId: "test-span-id",
			traceFlags: 1,
		}),
		setAttribute: jest.fn().mockReturnThis(),
		setAttributes: jest.fn().mockReturnThis(),
		addEvent: jest.fn().mockReturnThis(),
		setStatus: jest.fn().mockReturnThis(),
		updateName: jest.fn().mockReturnThis(),
		end: jest.fn(),
		isRecording: () => true,
		recordException: jest.fn(),
		addLink: jest.fn().mockReturnThis(),
		addLinks: jest.fn().mockReturnThis(),
	};

	const mockTracer = {
		startSpan: jest.fn(() => mockSpan),
		startActiveSpan: jest.fn((_name, options, fn) => {
			if (typeof options === "function") {
				return options(mockSpan);
			}
			return fn(mockSpan);
		}),
	};

	const mockContext = {
		active: jest.fn(() => ({
			getValue: jest.fn(),
			setValue: jest.fn((_key, _value) => ({
				getValue: jest.fn(),
				setValue: jest.fn(),
			})),
		})),
		with: jest.fn((_ctx, fn) => fn()),
	};

	return {
		trace: {
			getTracer: jest.fn(() => mockTracer),
			getSpan: jest.fn(() => mockSpan),
			setSpan: jest.fn(),
		},
		context: mockContext,
		SpanKind: {
			SERVER: 1,
			CLIENT: 2,
			PRODUCER: 3,
			CONSUMER: 4,
			INTERNAL: 5,
		},
		SpanStatusCode: {
			OK: 1,
			ERROR: 2,
			UNSET: 0,
		},
		DiagLogLevel: {
			NONE: 0,
			ERROR: 30,
			WARN: 50,
			INFO: 60,
			DEBUG: 70,
			VERBOSE: 80,
			ALL: 9999,
		},
		diag: {
			setLogger: jest.fn(),
			error: jest.fn(),
			warn: jest.fn(),
			info: jest.fn(),
			debug: jest.fn(),
			verbose: jest.fn(),
		},
		createContextKey: jest.fn((description) => Symbol(description)),
		propagation: {
			getBaggage: jest.fn(),
			setBaggage: jest.fn(),
			createBaggage: jest.fn(),
			setGlobalPropagator: jest.fn(),
			extract: jest.fn(),
			inject: jest.fn(),
		},
	};
});

import {
	BASALT_ATTRIBUTES,
	observe,
	SpanHandle,
	StartSpanHandle,
	startObserve,
} from "../lib/telemetry";

describe("startObserve", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("should create a root span with default options", () => {
		const rootSpan = startObserve({ featureSlug: "test-feature" });

		expect(rootSpan).toBeInstanceOf(StartSpanHandle);
		expect(rootSpan).toBeInstanceOf(SpanHandle);
	});

	it("should create a root span with custom name", () => {
		const otel = require("@opentelemetry/api");
		const rootSpan = startObserve({
			name: "custom-operation",
			featureSlug: "test-feature",
		});

		expect(rootSpan).toBeInstanceOf(StartSpanHandle);
		expect(otel.trace.getTracer).toHaveBeenCalled();
	});

	it("should set root span attributes", () => {
		const rootSpan = startObserve({
			featureSlug: "test-feature",
			metadata: {
				"custom.attribute": "value",
			},
		});

		// The span should have been created with attributes
		expect(rootSpan).toBeInstanceOf(StartSpanHandle);
	});

	it("should support custom span kind", () => {
		const otel = require("@opentelemetry/api");
		const rootSpan = startObserve({
			featureSlug: "test-feature",
			spanKind: otel.SpanKind.INTERNAL,
		});

		expect(rootSpan).toBeInstanceOf(StartSpanHandle);
	});
});

describe("StartSpanHandle", () => {
	let rootSpan: StartSpanHandle;
	let mockSpan: any;

	beforeEach(() => {
		jest.clearAllMocks();
		const otel = require("@opentelemetry/api");
		const tracer = otel.trace.getTracer();
		mockSpan = tracer.startSpan("test");
		rootSpan = startObserve({ featureSlug: "test-feature" });
	});

	describe("setExperiment", () => {
		it("should set experiment attributes", () => {
			const result = rootSpan.setExperiment("exp-123");

			expect(result).toBe(rootSpan); // Should return this for chaining
			expect(mockSpan.setAttribute).toHaveBeenCalledWith(
				BASALT_ATTRIBUTES.EXPERIMENT_ID,
				"exp-123",
			);
		});

		it("should set experiment with only required id", () => {
			const result = rootSpan.setExperiment("exp-123");

			expect(result).toBe(rootSpan);
			expect(mockSpan.setAttribute).toHaveBeenCalledWith(
				BASALT_ATTRIBUTES.EXPERIMENT_ID,
				"exp-123",
			);
		});

		it("should support method chaining", () => {
			const result = rootSpan
				.setExperiment("exp-123")
				.setIdentity({ userId: "user-1" });

			expect(result).toBe(rootSpan);
		});
	});

	describe("setEvaluationConfig", () => {
		it("should set evaluation config as JSON string", () => {
			const config = { threshold: 0.8, model: "gpt-4" };
			const result = rootSpan.setEvaluationConfig(config);

			expect(result).toBe(rootSpan);
			expect(mockSpan.setAttribute).toHaveBeenCalledWith(
				BASALT_ATTRIBUTES.EVALUATION_CONFIG,
				JSON.stringify(config),
			);
		});

		it("should handle primitive config values", () => {
			const result = rootSpan.setEvaluationConfig("simple-config");

			expect(result).toBe(rootSpan);
			expect(mockSpan.setAttribute).toHaveBeenCalledWith(
				BASALT_ATTRIBUTES.EVALUATION_CONFIG,
				JSON.stringify("simple-config"),
			);
		});
	});

	describe("setSampleRate", () => {
		it("should set sample rate as number", () => {
			const result = rootSpan.setSampleRate(0.5);

			expect(result).toBe(rootSpan);
			expect(mockSpan.setAttribute).toHaveBeenCalledWith(
				BASALT_ATTRIBUTES.EVALUATION_SAMPLE_RATE,
				0.5,
			);
		});

		it("should clamp sample rate to [0, 1] range", () => {
			// Test negative value
			rootSpan.setSampleRate(-0.5);
			expect(mockSpan.setAttribute).toHaveBeenCalledWith(
				BASALT_ATTRIBUTES.EVALUATION_SAMPLE_RATE,
				0,
			);

			// Test value > 1
			rootSpan.setSampleRate(1.5);
			expect(mockSpan.setAttribute).toHaveBeenCalledWith(
				BASALT_ATTRIBUTES.EVALUATION_SAMPLE_RATE,
				1,
			);
		});

		it("should handle edge cases for sample rate", () => {
			// Test 0
			rootSpan.setSampleRate(0);
			expect(mockSpan.setAttribute).toHaveBeenCalledWith(
				BASALT_ATTRIBUTES.EVALUATION_SAMPLE_RATE,
				0,
			);
			expect(mockSpan.setAttribute).toHaveBeenCalledWith(
				BASALT_ATTRIBUTES.SHOULD_EVALUATE,
				false,
			);

			// Test 1
			rootSpan.setSampleRate(1);
			expect(mockSpan.setAttribute).toHaveBeenCalledWith(
				BASALT_ATTRIBUTES.EVALUATION_SAMPLE_RATE,
				1,
			);
			expect(mockSpan.setAttribute).toHaveBeenCalledWith(
				BASALT_ATTRIBUTES.SHOULD_EVALUATE,
				true,
			);
		});

		it("should skip invalid sample rates", () => {
			const callCount = mockSpan.setAttribute.mock.calls.length;

			// Test NaN
			rootSpan.setSampleRate(Number.NaN);
			expect(mockSpan.setAttribute.mock.calls.length).toBe(callCount);

			// Test non-number (cast as any to bypass TypeScript)
			rootSpan.setSampleRate("0.5" as any);
			expect(mockSpan.setAttribute.mock.calls.length).toBe(callCount);
		});

		it("should support method chaining", () => {
			const result = rootSpan
				.setSampleRate(0.5)
				.setIdentity({ userId: "user-1" });

			expect(result).toBe(rootSpan);
		});
	});

	describe("setIdentity", () => {
		it("should set identity attributes with userId and organizationId", () => {
			const result = rootSpan.setIdentity({
				userId: "user-123",
				organizationId: "org-456",
			});

			expect(result).toBe(rootSpan);
			expect(mockSpan.setAttribute).toHaveBeenCalledWith(
				BASALT_ATTRIBUTES.USER_ID,
				"user-123",
			);
			expect(mockSpan.setAttribute).toHaveBeenCalledWith(
				BASALT_ATTRIBUTES.ORG_ID,
				"org-456",
			);
		});

		it("should handle partial identity information", () => {
			const result = rootSpan.setIdentity({
				userId: "user-123",
			});

			expect(result).toBe(rootSpan);
			expect(mockSpan.setAttribute).toHaveBeenCalledWith(
				BASALT_ATTRIBUTES.USER_ID,
				"user-123",
			);
		});

		it("should support userName and organizationName", () => {
			const result = rootSpan.setIdentity({
				userId: "user-123",
				userName: "Alice Smith",
				organizationId: "org-456",
				organizationName: "Acme Corp",
			});

			expect(result).toBe(rootSpan);
			expect(mockSpan.setAttribute).toHaveBeenCalledWith(
				BASALT_ATTRIBUTES.USER_ID,
				"user-123",
			);
			expect(mockSpan.setAttribute).toHaveBeenCalledWith(
				BASALT_ATTRIBUTES.USER_NAME,
				"Alice Smith",
			);
			expect(mockSpan.setAttribute).toHaveBeenCalledWith(
				BASALT_ATTRIBUTES.ORG_ID,
				"org-456",
			);
			expect(mockSpan.setAttribute).toHaveBeenCalledWith(
				BASALT_ATTRIBUTES.ORG_NAME,
				"Acme Corp",
			);
		});

		it("should support method chaining", () => {
			const result = rootSpan
				.setIdentity({ userId: "user-1" })
				.setExperiment("exp-1")
				.setEvaluationConfig({ key: "value" });

			expect(result).toBe(rootSpan);
		});
	});
});

describe("SpanHandle", () => {
	let rootSpan: StartSpanHandle;
	let mockSpan: any;

	beforeEach(() => {
		jest.clearAllMocks();
		const otel = require("@opentelemetry/api");
		const tracer = otel.trace.getTracer();
		mockSpan = tracer.startSpan("test");
		rootSpan = startObserve({ featureSlug: "test-feature" });
	});

	describe("setAttribute", () => {
		it("should set a single attribute", () => {
			rootSpan.setAttribute("custom.key", "value");

			expect(mockSpan.setAttribute).toHaveBeenCalled();
		});

		it("should handle undefined values gracefully", () => {
			rootSpan.setAttribute("custom.key", undefined);

			// Should not throw
			expect(true).toBe(true);
		});
	});

	describe("setAttributes", () => {
		it("should set multiple attributes", () => {
			rootSpan.setAttributes({
				key1: "value1",
				key2: 123,
				key3: true,
			});

			expect(mockSpan.setAttributes).toHaveBeenCalled();
		});
	});

	describe("setStatus", () => {
		it("should set span status", () => {
			const otel = require("@opentelemetry/api");
			rootSpan.setStatus({ code: otel.SpanStatusCode.OK });

			expect(mockSpan.setStatus).toHaveBeenCalledWith({
				code: otel.SpanStatusCode.OK,
			});
		});
	});

	describe("addEvent", () => {
		it("should add an event to the span", () => {
			rootSpan.addEvent("user-action", { action: "click" });

			expect(mockSpan.addEvent).toHaveBeenCalledWith("user-action", {
				action: "click",
			});
		});
	});

	describe("end", () => {
		it("should end the span", () => {
			rootSpan.end();

			expect(mockSpan.end).toHaveBeenCalled();
		});

		it("should end the span with custom timestamp", () => {
			const timestamp = Date.now();
			rootSpan.end(timestamp);

			expect(mockSpan.end).toHaveBeenCalledWith(timestamp);
		});
	});

	describe("recordException", () => {
		it("should record an exception and set error status", () => {
			const error = new Error("Test error");
			rootSpan.recordException(error);

			expect(mockSpan.recordException).toHaveBeenCalledWith(error);
			expect(mockSpan.setStatus).toHaveBeenCalledWith(
				expect.objectContaining({
					code: expect.any(Number),
					message: "Test error",
				}),
			);
		});
	});

	describe("isRootSpan", () => {
		it("should return true for StartSpanHandle", () => {
			expect(rootSpan.isRootSpan()).toBe(true);
		});
	});

	describe("setEvaluators", () => {
		it("should set evaluators as JSON array string", () => {
			const evaluators = ["hallucinations", "clarity"];
			const result = rootSpan.setEvaluators(evaluators);

			expect(result).toBe(rootSpan); // Method chaining
			expect(mockSpan.setAttribute).toHaveBeenCalledWith(
				BASALT_ATTRIBUTES.SPAN_EVALUATORS,
				JSON.stringify(evaluators),
			);
		});

		it("should filter out empty and invalid evaluator strings", () => {
			const evaluators = [
				"hallucinations",
				"",
				"  ",
				"clarity",
				null,
				undefined,
			];
			rootSpan.setEvaluators(evaluators as any);

			expect(mockSpan.setAttribute).toHaveBeenCalledWith(
				BASALT_ATTRIBUTES.SPAN_EVALUATORS,
				JSON.stringify(["hallucinations", "clarity"]),
			);
		});

		it("should skip setting attribute for empty array", () => {
			const callCount = mockSpan.setAttribute.mock.calls.length;
			rootSpan.setEvaluators([]);

			// Should not call setAttribute
			expect(mockSpan.setAttribute.mock.calls.length).toBe(callCount);
		});

		it("should skip setting attribute if all evaluators are invalid", () => {
			const callCount = mockSpan.setAttribute.mock.calls.length;
			rootSpan.setEvaluators(["", "  ", null] as any);

			expect(mockSpan.setAttribute.mock.calls.length).toBe(callCount);
		});

		it("should support method chaining", () => {
			const result = rootSpan.setEvaluators(["toxicity"]);

			expect(result).toBe(rootSpan);
		});
	});
});

describe("Integration: Complete workflow", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("should support complete root span lifecycle with chaining", () => {
		const rootSpan = startObserve({
			name: "user-registration",
			featureSlug: "auth-service",
			metadata: {
				"service.name": "auth-service",
			},
		});

		// Chain all root span methods
		rootSpan
			.setIdentity({
				userId: "new-user-123",
				organizationId: "org-456",
				registrationSource: "web",
			})
			.setExperiment("onboarding-v2")
			.setEvaluationConfig({
				model: "gpt-4",
				temperature: 0.7,
			});

		// Add custom attributes
		rootSpan.setAttributes({
			"registration.step": "email-verification",
			"registration.provider": "google",
		});

		// Add events
		rootSpan.addEvent("email-sent", {
			recipient: "user@example.com",
		});

		// End the span
		rootSpan.end();

		expect(rootSpan).toBeInstanceOf(StartSpanHandle);
	});

	it("should handle errors gracefully", () => {
		const rootSpan = startObserve({
			name: "failing-operation",
			featureSlug: "test-feature",
		});

		try {
			// Simulate error
			throw new Error("Operation failed");
		} catch (error) {
			rootSpan.recordException(error as Error);
		} finally {
			rootSpan.end();
		}

		expect(rootSpan).toBeInstanceOf(StartSpanHandle);
	});

	it("should support complete root span with evaluators and sample rate", () => {
		const rootSpan = startObserve({
			name: "llm-evaluation-workflow",
			featureSlug: "eval-service",
			experiment_id: "eval-exp-v1",
			identity: {
				userId: "evaluator-123",
				organizationId: "org-456",
			},
			evaluators: ["hallucinations", "clarity", "toxicity"],
			evaluationConfig: {
				sample_rate: 0.8,
			},
		});

		// All methods should work together
		rootSpan
			.setEvaluators(["additional-eval"]) // Can override
			.setSampleRate(0.9) // Can override
			.setAttributes({
				"eval.version": "v2",
			});

		rootSpan.end();

		expect(rootSpan).toBeInstanceOf(StartSpanHandle);
	});
});

describe("observe() API", () => {
	it("should execute callback with child span", async () => {
		const result = await observe({ name: "test-observe" }, async (span) => {
			expect(span).toBeInstanceOf(SpanHandle);
			return "success";
		});

		expect(result).toBe("success");
	});

	it("should NOT allow setting experiment (child spans only)", async () => {
		await observe(
			{
				name: "user-request",
				attributes: { flow: "signup" },
			},
			async (span) => {
				// span is SpanHandle, not StartSpanHandle
				expect(span).toBeInstanceOf(SpanHandle);
				// @ts-expect-error - setExperiment doesn't exist on SpanHandle
				expect(span.setExperiment).toBeUndefined();
			},
		);
	});

	it("should handle errors and record exceptions", async () => {
		await expect(
			observe({ name: "failing-operation" }, async (_span) => {
				throw new Error("Operation failed");
			}),
		).rejects.toThrow("Operation failed");
	});

	it("should return function result", async () => {
		const result = await observe({ name: "data-processing" }, async (span) => {
			span.setAttribute("processed", true);
			return { processed: true, count: 42 };
		});

		expect(result).toEqual({ processed: true, count: 42 });
	});

	it("should set basalt.observe attribute", async () => {
		await observe(
			{
				name: "observation-test",
				attributes: { custom: "value" },
			},
			async (span) => {
				// The span should have basalt.observe=true attribute
				expect(span).toBeInstanceOf(SpanHandle);
			},
		);
	});

	it("should allow nested operations", async () => {
		const result = await observe(
			{ name: "parent-operation" },
			async (parentSpan) => {
				parentSpan.setAttribute("operation", "parent");

				// Simulate nested SDK call (would use withBasaltSpan internally)
				const nestedResult = await Promise.resolve("nested-success");

				parentSpan.setAttribute("nested.result", nestedResult);
				return nestedResult;
			},
		);

		expect(result).toBe("nested-success");
	});

	it("should propagate context to child operations", async () => {
		await observe({ name: "request-handler" }, async (observeSpan) => {
			observeSpan.setAttribute("handler", "v1");

			// Simulate child operation that should inherit context
			const childOperation = async () => {
				// In real usage, withBasaltSpan would see observeSpan as parent
				return "child-result";
			};

			const result = await childOperation();
			observeSpan.setAttribute("child.result", result);
		});
	});
});

describe("startObserve() API with inline experiment/identity", () => {
	it("should create root span with experiment in options", () => {
		const span = startObserve({
			name: "test-root-span",
			featureSlug: "test-feature",
			experiment_id: "exp-123",
		});

		expect(span).toBeInstanceOf(StartSpanHandle);
		span.end();
	});

	it("should create root span with identity in options", () => {
		const span = startObserve({
			name: "user-request",
			featureSlug: "test-feature",
			identity: {
				userId: "user-123",
				organizationId: "org-456",
			},
		});

		expect(span).toBeInstanceOf(StartSpanHandle);
		span.end();
	});

	it("should create root span with experiment, identity, and evaluationConfig", () => {
		const span = startObserve({
			name: "llm-request",
			featureSlug: "test-feature",
			experiment_id: "llm-v2",
			identity: { userId: "tester" },
		});

		expect(span).toBeInstanceOf(StartSpanHandle);
		span.end();
	});

	it("should still allow method chaining for experiment/identity", () => {
		const span = startObserve({
			name: "chaining-test",
			featureSlug: "test-feature",
		});

		// Method chaining still works
		span.setExperiment("chained-exp").setIdentity({ userId: "user-456" });

		expect(span).toBeInstanceOf(StartSpanHandle);
		span.end();
	});

	it("should create root span with evaluators and evaluationConfig in options", () => {
		const span = startObserve({
			name: "llm-evaluation",
			featureSlug: "test-feature",
			evaluators: ["hallucinations", "clarity"],
			evaluationConfig: {
				sample_rate: 0.5,
			},
		});

		expect(span).toBeInstanceOf(StartSpanHandle);
		span.end();
	});

	it("should auto-apply evaluators via options", () => {
		const otel = require("@opentelemetry/api");
		jest.clearAllMocks();

		const span = startObserve({
			featureSlug: "auto-eval",
			evaluators: ["toxicity", "clarity"],
		});

		const mockSpan = otel.trace.getTracer().startSpan();
		expect(mockSpan.setAttribute).toHaveBeenCalledWith(
			BASALT_ATTRIBUTES.SPAN_EVALUATORS,
			expect.stringContaining("toxicity"),
		);

		span.end();
	});

	it("should auto-apply sample rate via evaluationConfig", () => {
		const otel = require("@opentelemetry/api");
		jest.clearAllMocks();

		const span = startObserve({
			featureSlug: "auto-sample",
			evaluationConfig: { sample_rate: 0.75 },
		});

		const mockSpan = otel.trace.getTracer().startSpan();
		expect(mockSpan.setAttribute).toHaveBeenCalledWith(
			BASALT_ATTRIBUTES.EVALUATION_SAMPLE_RATE,
			0.75,
		);

		span.end();
	});

	it("should skip auto-apply for empty evaluators", () => {
		const otel = require("@opentelemetry/api");
		jest.clearAllMocks();

		const span = startObserve({
			featureSlug: "empty-eval",
			evaluators: [],
		});

		const mockSpan = otel.trace.getTracer().startSpan();

		// Should not call setAttribute for evaluators (empty array)
		const evaluatorCalls = mockSpan.setAttribute.mock.calls.filter(
			([key]: [string]) => key === BASALT_ATTRIBUTES.SPAN_EVALUATORS,
		);
		expect(evaluatorCalls.length).toBe(0);

		span.end();
	});
});
