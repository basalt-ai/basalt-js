import { CreateGenerationParams, Generation } from './generation.types';
import { Log } from './log.types';
import { Metadata } from './monitor.types';
import { CreateSpanParams, Span } from './span.types';

export interface TraceParams {
	input?: string | undefined;
	output?: string | undefined;
	startTime?: Date | string | undefined;
	endTime?: Date | string | undefined;
	user?: User | undefined;
	organization?: Organization | undefined;
	metadata?: Metadata | undefined
}

export interface Trace extends TraceParams{
	startTime: Date
	logs: Log[]

	/* --------------------------------- Methods -------------------------------- */
	start(input?: string): Trace

	setMetadata(metadata: Metadata): Trace
	update(params: Partial<TraceParams>): Trace

	append(log: Log): Trace

	identify(id: string, params: Omit<User, 'id'>): Trace
	identify(user: User): Trace

	createGeneration(params: CreateGenerationParams): Generation
	createSpan(params: CreateSpanParams): Span

	end(output?: string): Trace
}

export interface Organization {
	id: string;
	name: string;
	[key: string]: string;
}

export interface User {
	id: string;
	name: string;
	[key: string]: string;
}