import type {
	Span,
	Tracer,
	Context,
	Attributes,
	Link,
	SpanOptions,
} from "@opentelemetry/api";
import type { SpanCallback, AttributeValue } from "./types";

/**
 * Safely import OpenTelemetry API
 * Returns undefined if @opentelemetry/api is not installed
 */
function safelyImportOtel(): typeof import("@opentelemetry/api") | undefined {
	try {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		return require("@opentelemetry/api");
	} catch {
		return undefined;
	}
}

const otel = safelyImportOtel();

/**
 * Check if OpenTelemetry is available and configured
 */
export function isOtelAvailable(): boolean {
	return otel !== undefined;
}

/**
 * Get a tracer for the SDK
 * Returns a no-op tracer if OpenTelemetry is not available
 *
 * @param name - Tracer name (typically the SDK name)
 * @param version - SDK version
 */
export function getTracer(name: string, version?: string): Tracer {
	if (!otel) {
		return createNoOpTracer();
	}

	try {
		return otel.trace.getTracer(name, version);
	} catch {
		return createNoOpTracer();
	}
}

/**
 * Create a no-op tracer that does nothing
 */
function createNoOpTracer(): Tracer {
	const noOpSpan: Span = {
		spanContext: () => ({
			traceId: "",
			spanId: "",
			traceFlags: 0,
		}),
		setAttribute: () => noOpSpan,
		setAttributes: () => noOpSpan,
		addEvent: () => noOpSpan,
		setStatus: () => noOpSpan,
		updateName: () => noOpSpan,
		end: () => { },
		isRecording: () => false,
		recordException: () => { },
		addLink: () => noOpSpan,
		addLinks: () => noOpSpan,
	};

	function startActiveSpan<F extends (span: Span) => unknown>(
		name: string,
		fn: F
	): ReturnType<F>;
	function startActiveSpan<F extends (span: Span) => unknown>(
		name: string,
		options: SpanOptions,
		fn: F
	): ReturnType<F>;
	function startActiveSpan<F extends (span: Span) => unknown>(
		name: string,
		options: SpanOptions,
		context: Context,
		fn: F
	): ReturnType<F>;
	function startActiveSpan<F extends (span: Span) => unknown>(
		_name: string,
		optionsOrFn: SpanOptions | F,
		contextOrFn?: Context | F,
		fnMaybe?: F
	): ReturnType<F> {
		const fn =
			typeof optionsOrFn === "function"
				? optionsOrFn
				: typeof contextOrFn === "function"
					? contextOrFn
					: fnMaybe;

		return (fn as F)(noOpSpan) as ReturnType<F>;
	}

	return {
		startSpan: () => noOpSpan,
		startActiveSpan,
	};
}

/**
 * Sanitize attributes to ensure they're valid for OpenTelemetry
 * Filters out undefined/null values and converts types as needed
 */
export function sanitizeAttributes(attrs: Record<string, unknown>): Attributes {
	const sanitized: Attributes = {};

	for (const [key, value] of Object.entries(attrs)) {
		if (value === undefined || value === null) {
			continue;
		}

		// OpenTelemetry accepts: string, number, boolean, array of these
		if (
			typeof value === "string" ||
			typeof value === "number" ||
			typeof value === "boolean"
		) {
			sanitized[key] = value;
		} else if (Array.isArray(value)) {
			const primitives = value.filter(
				(v): v is string | number | boolean =>
					typeof v === "string" ||
					typeof v === "number" ||
					typeof v === "boolean"
			);

			if (primitives.length === 0) {
				continue;
			}

			if (primitives.every((v): v is string => typeof v === "string")) {
				sanitized[key] = primitives;
				continue;
			}

			if (primitives.every((v): v is number => typeof v === "number")) {
				sanitized[key] = primitives;
				continue;
			}

			if (primitives.every((v): v is boolean => typeof v === "boolean")) {
				sanitized[key] = primitives;
				continue;
			}

			// Mixed primitive arrays aren't valid AttributeValue arrays; store as JSON string.
			try {
				sanitized[key] = JSON.stringify(primitives);
			} catch {
				// Skip if JSON serialization fails
			}
		} else if (typeof value === "object") {
			// Convert objects to JSON string
			try {
				sanitized[key] = JSON.stringify(value);
			} catch {
				// Skip if JSON serialization fails
			}
		}
	}

	return sanitized;
}

/**
 * Flatten nested metadata object with a prefix
 *
 * @param metadata - Metadata object to flatten
 * @param prefix - Prefix for flattened keys
 */
export function flattenMetadata(
	metadata: Record<string, unknown> | undefined,
	prefix = "basalt.meta."
): Record<string, AttributeValue> {
	if (!metadata) {
		return {};
	}

	const flattened: Record<string, AttributeValue> = {};

	for (const [key, value] of Object.entries(metadata)) {
		const flatKey = `${prefix}${key}`;

		if (value === undefined || value === null) {
			continue;
		}

		if (
			typeof value === "string" ||
			typeof value === "number" ||
			typeof value === "boolean"
		) {
			flattened[flatKey] = value;
		} else {
			// Convert complex values to JSON string
			try {
				flattened[flatKey] = JSON.stringify(value);
			} catch {
				// Skip if serialization fails
			}
		}
	}

	return flattened;
}

/**
 * Create and manage a span for an async operation
 * Automatically handles span lifecycle, error recording, and status
 *
 * @param tracerName - Name of the tracer (typically SDK name)
 * @param spanName - Name of the span
 * @param attributes - Initial span attributes
 * @param fn - Async function to execute within the span
 * @returns Result of the async function
 */
export async function withSpan<T>(
	tracerName: string,
	spanName: string,
	attributes: Record<string, unknown>,
	fn: SpanCallback<T>
): Promise<T> {
	if (!otel) {
		// OpenTelemetry not available, execute function directly
		const noOpSpan = createNoOpTracer().startSpan(spanName);
		return fn(noOpSpan);
	}

	const tracer = getTracer(tracerName, __SDK_VERSION__);
	const sanitized = sanitizeAttributes(attributes);

	return tracer.startActiveSpan(
		spanName,
		{
			kind: otel.SpanKind.CLIENT,
			attributes: sanitized,
		},
		async (span: Span) => {
			try {
				const result = await fn(span);

				// Set OK status if no error occurred
				span.setStatus({ code: otel.SpanStatusCode.OK });

				return result;
			} catch (error) {
				// Record exception and set error status
				span.recordException(error as Error);
				span.setStatus({
					code: otel.SpanStatusCode.ERROR,
					message: error instanceof Error ? error.message : String(error),
				});

				// Re-throw to maintain error propagation
				throw error;
			} finally {
				// Always end the span
				span.end();
			}
		}
	);
}

/**
 * Create and manage a span for a sync operation
 * Note: Most SDK operations are async, but this is provided for completeness
 *
 * @param tracerName - Name of the tracer
 * @param spanName - Name of the span
 * @param attributes - Initial span attributes
 * @param fn - Sync function to execute within the span
 * @returns Result of the function
 */
export function withSpanSync<T>(
	tracerName: string,
	spanName: string,
	attributes: Record<string, unknown>,
	fn: (span: Span) => T
): T {
	if (!otel) {
		const noOpSpan = createNoOpTracer().startSpan(spanName);
		return fn(noOpSpan);
	}

	const tracer = getTracer(tracerName, __SDK_VERSION__);
	const sanitized = sanitizeAttributes(attributes);

	return tracer.startActiveSpan(
		spanName,
		{
			kind: otel.SpanKind.CLIENT,
			attributes: sanitized,
		},
		(span: Span) => {
			try {
				const result = fn(span);
				span.setStatus({ code: otel.SpanStatusCode.OK });
				return result;
			} catch (error) {
				span.recordException(error as Error);
				span.setStatus({
					code: otel.SpanStatusCode.ERROR,
					message: error instanceof Error ? error.message : String(error),
				});
				throw error;
			} finally {
				span.end();
			}
		}
	);
}

/**
 * Get the currently active OpenTelemetry context
 */
export function getCurrentContext(): Context | undefined {
	return otel?.context.active();
}

/**
 * Execute a function within a specific OpenTelemetry context
 *
 * @param ctx - Context to use
 * @param fn - Function to execute
 */
export function withContext<T>(ctx: Context, fn: () => T): T {
	if (!otel) {
		return fn();
	}

	return otel.context.with(ctx, fn);
}

/**
 * Set attributes on the current active span (if any).
 * Safe no-op when OpenTelemetry isn't available or there's no active span.
 */
export function setCurrentSpanAttributes(attrs: Record<string, unknown>): void {
	if (!otel) {
		return;
	}

	const span = otel.trace.getSpan(otel.context.active());
	if (!span) {
		return;
	}

	span.setAttributes(sanitizeAttributes(attrs));
}

/**
 * Extract the client name from an API path
 * e.g., "/prompts/slug" -> "prompts"
 *
 * @param path - API path
 */
export function extractClientFromPath(path: string): string {
	const match = path.match(/^\/([^/]+)/);
	return match ? match[1] : "unknown";
}
