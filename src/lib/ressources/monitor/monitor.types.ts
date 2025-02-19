import { Generation, GenerationParams } from './generation.types';
import { Span, SpanParams } from './span.types';
import { Trace, TraceParams } from './trace.types'

/**
 * @preserve
 * Interface for interacting with Basalt monitoring.
 */
export interface IMonitorSDK {
	createTrace(slug: string, params?: TraceParams): Trace;
	createGeneration(params: GenerationParams): Generation;
	createSpan(params: SpanParams): Span;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Metadata = Record<string, any>