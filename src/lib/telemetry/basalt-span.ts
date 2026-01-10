import { BASALT_ATTRIBUTES } from "./attributes";
import { BasaltContextManager } from "./context-manager";
import type { SpanHandle } from "./span-handle";
import { withSpan, withSpanSync } from "./telemetry";
import { ObserveKind } from "./types";

export type { SpanHandle };

type BasaltSpanAttributes = {
	kind?: ObserveKind;
} & Record<string, unknown>;

const DEFAULT_SPAN_KIND: ObserveKind = ObserveKind.SPAN;
const EMPTY_ATTRIBUTES: BasaltSpanAttributes = {};

function buildBasaltAttributes(
	tracerName: string,
	spanName: string,
	attributes: BasaltSpanAttributes,
): Record<string, unknown> {
	const { kind, ...restAttributes } = attributes;

	return {
		[BASALT_ATTRIBUTES.TRACE]: true,
		// String for compatibility with existing telemetry schema.
		[BASALT_ATTRIBUTES.IN_TRACE]: "true",
		[BASALT_ATTRIBUTES.SPAN_KIND]: kind ?? DEFAULT_SPAN_KIND,
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
	fn: (span: SpanHandle) => Promise<T>,
): Promise<T>;
export async function withBasaltSpan<T>(
	tracerName: string,
	spanName: string,
	attributes: BasaltSpanAttributes,
	fn: (span: SpanHandle) => Promise<T>,
): Promise<T>;
export async function withBasaltSpan<T>(
	tracerName: string,
	spanName: string,
	attributesOrFn: BasaltSpanAttributes | ((span: SpanHandle) => Promise<T>),
	maybeFn?: (span: SpanHandle) => Promise<T>,
): Promise<T> {
	// Allow omitting attributes by passing the callback as the third argument.
	const [attributes, fn] =
		typeof attributesOrFn === "function"
			? [EMPTY_ATTRIBUTES, attributesOrFn]
			: [attributesOrFn ?? EMPTY_ATTRIBUTES, maybeFn];
	if (!fn) {
		throw new TypeError(
			"withBasaltSpan requires a callback function as the last argument",
		);
	}
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
	fn: (span: SpanHandle) => T,
): T;
export function withBasaltSpanSync<T>(
	tracerName: string,
	spanName: string,
	attributes: BasaltSpanAttributes,
	fn: (span: SpanHandle) => T,
): T;
export function withBasaltSpanSync<T>(
	tracerName: string,
	spanName: string,
	attributesOrFn: BasaltSpanAttributes | ((span: SpanHandle) => T),
	maybeFn?: (span: SpanHandle) => T,
): T {
	// Allow omitting attributes by passing the callback as the third argument.
	const [attributes, fn] =
		typeof attributesOrFn === "function"
			? [EMPTY_ATTRIBUTES, attributesOrFn]
			: [attributesOrFn ?? EMPTY_ATTRIBUTES, maybeFn];
	if (!fn) {
		throw new TypeError(
			"withBasaltSpanSync requires a callback function as the last argument",
		);
	}
	const mergedAttributes = buildBasaltAttributes(
		tracerName,
		spanName,
		attributes,
	);
	return withSpanSync(tracerName, spanName, mergedAttributes, fn);
}
