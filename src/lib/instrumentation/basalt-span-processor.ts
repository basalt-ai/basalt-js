import type { Context, Span } from "@opentelemetry/api";
import type { SpanProcessor } from "@opentelemetry/sdk-trace-base";
import { BASALT_ATTRIBUTES } from "../telemetry/attributes";
import { BasaltContextManager } from "../telemetry/context-manager";
import { ObserveKind } from "../telemetry/types";

function hasBasaltTraceAttributes(attrs: Record<string, unknown>): boolean {
	return (
		attrs[BASALT_ATTRIBUTES.TRACE] === true ||
		attrs[BASALT_ATTRIBUTES.IN_TRACE] === "true"
	);
}

function isGenAISpan(attrs: Record<string, unknown>): boolean {
	return (
		typeof attrs["gen_ai.operation.name"] === "string" ||
		typeof attrs["gen_ai.system"] === "string"
	);
}

function serializeAttributePayload(
	payload: Record<string, unknown>,
): string | undefined {
	if (Object.keys(payload).length === 0) {
		return undefined;
	}

	try {
		return JSON.stringify(payload);
	} catch {
		return "[Serialization Error]";
	}
}

function buildGenAIInputPayload(
	attrs: Record<string, unknown>,
): Record<string, unknown> {
	const payload: Record<string, unknown> = {};

	const operation = attrs["gen_ai.operation.name"];
	if (operation !== undefined) {
		payload["operation"] = operation;
	}

	const model = attrs["gen_ai.request.model"];
	if (model !== undefined) {
		payload["model"] = model;
	}

	const system = attrs["gen_ai.system"];
	if (system !== undefined) {
		payload["system"] = system;
	}

	const temperature = attrs["gen_ai.request.temperature"];
	if (temperature !== undefined) {
		payload["temperature"] = temperature;
	}

	const maxTokens = attrs["gen_ai.request.max_tokens"];
	if (maxTokens !== undefined) {
		payload["max_tokens"] = maxTokens;
	}

	const topP = attrs["gen_ai.request.top_p"];
	if (topP !== undefined) {
		payload["top_p"] = topP;
	}

	const stopSequences = attrs["gen_ai.request.stop_sequences"];
	if (stopSequences !== undefined) {
		payload["stop_sequences"] = stopSequences;
	}

	return payload;
}

function buildGenAIOutputPayload(
	attrs: Record<string, unknown>,
): Record<string, unknown> {
	const payload: Record<string, unknown> = {};

	const responseId = attrs["gen_ai.response.id"];
	if (responseId !== undefined) {
		payload["response_id"] = responseId;
	}

	const responseModel = attrs["gen_ai.response.model"];
	if (responseModel !== undefined) {
		payload["response_model"] = responseModel;
	}

	const finishReasons = attrs["gen_ai.response.finish_reasons"];
	if (finishReasons !== undefined) {
		payload["finish_reasons"] = finishReasons;
	}

	const inputTokens = attrs["gen_ai.usage.input_tokens"];
	if (inputTokens !== undefined) {
		payload["input_tokens"] = inputTokens;
	}

	const outputTokens = attrs["gen_ai.usage.output_tokens"];
	if (outputTokens !== undefined) {
		payload["output_tokens"] = outputTokens;
	}

	return payload;
}

/**
 * SpanProcessor that automatically adds Basalt context attributes to all spans.
 *
 * This ensures that spans created by third-party instrumentation libraries
 * (like GenAI provider instrumentations) automatically inherit Basalt context
 * attributes such as user ID, organization ID, experiment, feature slug, and metadata.
 *
 * The processor is called by OpenTelemetry for EVERY span that is created,
 * regardless of which instrumentation library created it.
 */
export class BasaltSpanProcessor implements SpanProcessor {
	/**
	 * Called when a span is started.
	 * Extracts Basalt context and adds it as span attributes.
	 */
	onStart(span: Span, _parentContext: Context): void {
		// Extract Basalt context attributes from the current context
		const basaltAttrs = BasaltContextManager.extractAttributes();

		// Only add attributes if Basalt context exists
		if (Object.keys(basaltAttrs).length > 0) {
			// Add basalt.trace marker for filtering
			span.setAttribute(BASALT_ATTRIBUTES.TRACE, true);
			span.setAttribute(BASALT_ATTRIBUTES.IN_TRACE, "true");

			// Add all Basalt context attributes
			// This includes: user ID, org ID, experiment, feature slug, metadata
			span.setAttributes(basaltAttrs);
		}
	}

	/**
	 * Called when a span is ended.
	 * Enriches auto-instrumented GenAI spans with Basalt generation markers.
	 */
	onEnd(span: any): void {
		try {
			const attrs = span?.attributes as Record<string, unknown> | undefined;
			if (!attrs || !hasBasaltTraceAttributes(attrs) || !isGenAISpan(attrs)) {
				return;
			}

			if (attrs[BASALT_ATTRIBUTES.SPAN_KIND] === undefined) {
				attrs[BASALT_ATTRIBUTES.SPAN_KIND] = ObserveKind.GENERATION;
			}

			if (attrs[BASALT_ATTRIBUTES.SPAN_TYPE] === undefined) {
				attrs[BASALT_ATTRIBUTES.SPAN_TYPE] = ObserveKind.GENERATION;
			}

			if (attrs[BASALT_ATTRIBUTES.SPAN_INPUT] === undefined) {
				const inputPayload = buildGenAIInputPayload(attrs);
				const serializedInput = serializeAttributePayload(inputPayload);
				if (serializedInput !== undefined) {
					attrs[BASALT_ATTRIBUTES.SPAN_INPUT] = serializedInput;
				}
			}

			if (attrs[BASALT_ATTRIBUTES.SPAN_OUTPUT] === undefined) {
				const outputPayload = buildGenAIOutputPayload(attrs);
				const serializedOutput = serializeAttributePayload(outputPayload);
				if (serializedOutput !== undefined) {
					attrs[BASALT_ATTRIBUTES.SPAN_OUTPUT] = serializedOutput;
				}
			}
		} catch {
			// Never break span export on enrichment failures.
		}
	}

	/**
	 * Shutdown the processor.
	 * No-op for this processor.
	 */
	shutdown(): Promise<void> {
		return Promise.resolve();
	}

	/**
	 * Force flush the processor.
	 * No-op for this processor.
	 */
	forceFlush(): Promise<void> {
		return Promise.resolve();
	}
}
