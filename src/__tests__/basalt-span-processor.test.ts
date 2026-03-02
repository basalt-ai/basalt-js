import { BasaltSpanProcessor } from "../lib/instrumentation/basalt-span-processor";

describe("BasaltSpanProcessor", () => {
	it("enriches GenAI spans in a Basalt trace", () => {
		const processor = new BasaltSpanProcessor();
		const span = {
			attributes: {
				"basalt.trace": true,
				"basalt.in_trace": "true",
				"gen_ai.operation.name": "chat",
				"gen_ai.request.model": "gpt-4o-mini",
				"gen_ai.system": "openai",
				"gen_ai.response.id": "resp_123",
				"gen_ai.response.model": "gpt-4o-mini-2024-07-18",
				"gen_ai.usage.input_tokens": 10,
				"gen_ai.usage.output_tokens": 20,
			},
		};

		processor.onEnd(span as any);

		expect(span.attributes["basalt.span.kind"]).toBe("generation");
		expect(span.attributes["basalt.span_type"]).toBe("generation");

		expect(span.attributes["basalt.span.input"]).toBe(
			JSON.stringify({
				operation: "chat",
				model: "gpt-4o-mini",
				system: "openai",
			}),
		);

		expect(span.attributes["basalt.span.output"]).toBe(
			JSON.stringify({
				response_id: "resp_123",
				response_model: "gpt-4o-mini-2024-07-18",
				input_tokens: 10,
				output_tokens: 20,
			}),
		);
	});

	it("does not enrich spans outside a Basalt trace", () => {
		const processor = new BasaltSpanProcessor();
		const span = {
			attributes: {
				"gen_ai.operation.name": "chat",
				"gen_ai.request.model": "gpt-4o-mini",
			},
		};

		processor.onEnd(span as any);

		expect(span.attributes["basalt.span.kind"]).toBeUndefined();
		expect(span.attributes["basalt.span_type"]).toBeUndefined();
		expect(span.attributes["basalt.span.input"]).toBeUndefined();
		expect(span.attributes["basalt.span.output"]).toBeUndefined();
	});

	it("preserves pre-existing basalt generation attributes", () => {
		const processor = new BasaltSpanProcessor();
		const span = {
			attributes: {
				"basalt.trace": true,
				"gen_ai.operation.name": "chat",
				"basalt.span.kind": "generation",
				"basalt.span_type": "generation",
				"basalt.span.input": "custom-input",
				"basalt.span.output": "custom-output",
			},
		};

		processor.onEnd(span as any);

		expect(span.attributes["basalt.span.input"]).toBe("custom-input");
		expect(span.attributes["basalt.span.output"]).toBe("custom-output");
	});

	it("does not throw when span attributes are immutable", () => {
		const processor = new BasaltSpanProcessor();
		const span = {
			attributes: Object.freeze({
				"basalt.trace": true,
				"gen_ai.operation.name": "chat",
				"gen_ai.request.model": "gpt-4o-mini",
			}),
		};

		expect(() => processor.onEnd(span as any)).not.toThrow();
	});
});
