import { Log } from './log'
import { Metadata } from './monitor.types'
import { Trace } from './trace.types'

export interface BaseLogParams {
	/**
	 * The type of log entry (e.g., 'span', 'generation').
	 * Used to distinguish between different kinds of logs.
	 */
	type: LogType

	/**
	 * Name of the log entry, describing what it represents.
	 */
	name: string

	/**
	 * When the log entry started, can be a Date object or ISO string.
	 * If not provided, defaults to the current time when created.
	 */
	startTime?: Date | string | undefined

	/**
	 * When the log entry ended, can be a Date object or ISO string.
	 * Can be set later using the end() method.
	 */
	endTime?: Date | string | undefined

	/**
	 * Additional contextual information about this log entry.
	 * Can be any structured data relevant to the operation being logged.
	 */
	metadata?: Record<string, unknown> | undefined

	/**
	 * Optional parent span if this log is part of a larger operation.
	 * Used to establish hierarchical relationships between operations.
	 */
	parent?: Log | undefined

	/**
	 * The trace this log belongs to, providing the overall context.
	 * Every log must be associated with a trace.
	 */
	trace: Trace
}

export type LogType = 'span' | 'generation' | 'function' | 'tool' | 'retrieval' | 'event'

export type UpdateParams = Partial<Omit<BaseLogParams, 'trace'>>

export interface BaseLog extends BaseLogParams {
	/**
	 * Unique identifier for this log entry.
	 * Automatically generated when the log is created.
	 */
	id: string

	/**
	 * The type of log entry (e.g., 'span', 'generation').
	 * Used to distinguish between different kinds of logs.
	 */
	type: LogType

	/**
	 * Additional contextual information about this log entry.
	 * Can be any structured data relevant to the operation being logged.
	 */
	metadata?: Record<string, unknown> | undefined

	start(): BaseLog
	setMetadata(metadata: Metadata): BaseLog
	update(params: UpdateParams): BaseLog
	end(): BaseLog
}
