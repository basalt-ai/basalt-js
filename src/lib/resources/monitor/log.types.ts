import { GenerationPrompt } from './generation.types';
import { Metadata } from './monitor.types'
import { Span } from './span.types';
import { Trace } from './trace.types'

export interface LogParams {
	name: string;
	startTime?: Date | string | undefined;
	endTime?: Date | string | undefined
	metadata?: Record<string, unknown> | undefined
	parent?: Span | undefined;

	trace: Trace;
}

export type UpdateParams = Partial<Omit<LogParams, 'trace'>>

/**
 * Log interface
 */
export interface Log extends LogParams {
	/**
	 * Explain more
	 */
	id: string;
	type: string
	metadata?: Record<string, unknown> | undefined
	prompt?: GenerationPrompt | undefined

	start(): Log
	setMetadata(metadata: Metadata): Log
	update(params: UpdateParams): Log
	end(): Log
}
