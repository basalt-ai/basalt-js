import type { Span } from '@opentelemetry/api'
import type { SpanCallback } from './types'

import { BASALT_ATTRIBUTES } from './attributes'
import { BasaltContextManager } from './context-manager'
import { withSpan, withSpanSync } from './telemetry'

function buildBasaltAttributes(
	tracerName: string,
	spanName: string,
	attributes: Record<string, unknown>,
): Record<string, unknown> {
	return {
		[BASALT_ATTRIBUTES.TRACE]: true,
		[BASALT_ATTRIBUTES.SDK]: tracerName,
		[BASALT_ATTRIBUTES.VERSION]: __SDK_VERSION__,
		[BASALT_ATTRIBUTES.SPAN_TYPE]: spanName,
		...BasaltContextManager.extractAttributes(),
		...attributes,
	}
}

export async function withBasaltSpan<T>(
	tracerName: string,
	spanName: string,
	attributes: Record<string, unknown>,
	fn: SpanCallback<T>,
): Promise<T> {
	const mergedAttributes = buildBasaltAttributes(tracerName, spanName, attributes)
	return withSpan(tracerName, spanName, mergedAttributes, fn)
}

export function withBasaltSpanSync<T>(
	tracerName: string,
	spanName: string,
	attributes: Record<string, unknown>,
	fn: (span: Span) => T,
): T {
	const mergedAttributes = buildBasaltAttributes(tracerName, spanName, attributes)
	return withSpanSync(tracerName, spanName, mergedAttributes, fn)
}
