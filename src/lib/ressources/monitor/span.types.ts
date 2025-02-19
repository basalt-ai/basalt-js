import { CreateGenerationParams, Generation } from './generation.types';
import { Log, LogParams } from './log.types'
import { Trace } from './trace.types';


export type CreateSpanParams = Omit<SpanParams, 'trace'>

export interface Span extends SpanParams, Log {
	type: string;
	trace: Trace;

	start(input?: string): Span;
	end(output?: string): Span;

	append(log: Log): Span

	createGeneration(params: CreateGenerationParams): Generation
	createSpan(params: CreateSpanParams): Span
}

export interface SpanParams extends LogParams {
	type?: string | undefined;
	input?: string | undefined;
}

// Type guards
export function isSpan(log: Log): log is Span {
	return log.type !== 'generation'
}
