import { BASALT_ATTRIBUTES } from "./attributes";
import { BasaltContextManager } from "./context-manager";
import type { SpanHandle } from "./span-handle";
import { withSpan, withSpanSync } from "./telemetry";
import type { ObserveKind } from "./types";

export type { SpanHandle };

function buildBasaltAttributes(
	tracerName: string,
	spanName: string,
	attributes: Record<string, unknown>,
): Record<string, unknown> {
	// Extract kind from attributes if provided
	// biome-ignore lint/complexity/useLiteralKeys: false
	const kind = attributes["kind"] as ObserveKind | undefined;
	const { kind: _, ...restAttributes } = attributes;

	return {
		[BASALT_ATTRIBUTES.TRACE]: true,
		[BASALT_ATTRIBUTES.IN_TRACE]: "true",
		[BASALT_ATTRIBUTES.SPAN_KIND]: kind || "span",
		[BASALT_ATTRIBUTES.SDK]: tracerName,
		[BASALT_ATTRIBUTES.VERSION]: __SDK_VERSION__,
		[BASALT_ATTRIBUTES.SPAN_TYPE]: spanName,
		...BasaltContextManager.extractAttributes(),
		...restAttributes,
	};
}

export async function withBasaltSpan<T>(
	tracerName: string,
	spanName: string,
	attributes: Record<string, unknown>,
	fn: (span: SpanHandle) => Promise<T>,
): Promise<T> {
	const mergedAttributes = buildBasaltAttributes(
		tracerName,
		spanName,
		attributes,
	);
	return withSpan(tracerName, spanName, mergedAttributes, fn);
}

export function withBasaltSpanSync<T>(
	tracerName: string,
	spanName: string,
	attributes: Record<string, unknown>,
	fn: (span: SpanHandle) => T,
): T {
	const mergedAttributes = buildBasaltAttributes(
		tracerName,
		spanName,
		attributes,
	);
	return withSpanSync(tracerName, spanName, mergedAttributes, fn);
}
