import type { Context, Span } from "@opentelemetry/api";
import type { SpanProcessor } from "@opentelemetry/sdk-trace-base";
import { BASALT_ATTRIBUTES } from "../telemetry/attributes";
import { BasaltContextManager } from "../telemetry/context-manager";

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
	 * No-op for this processor.
	 */
	onEnd(): void {
		// No-op
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
