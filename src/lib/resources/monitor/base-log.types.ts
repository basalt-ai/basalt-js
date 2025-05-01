import { Evaluator } from './evaluator.types'
import { Log } from './log.types'
import { Metadata } from './monitor.types'
import { Trace } from './trace.types'

export interface BaseLogParams {
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

	/**
	 * The evaluators to attach to the log.
	 */
	evaluators?: Evaluator[] | undefined
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

	/**
	 * Marks the log as started and sets the input if provided.
	 *
	 * @param input - Optional input data to associate with the log.
	 * @returns The log instance for method chaining.
	 */
	start(): BaseLog

	/**
	 * Sets the metadata for the log.
	 *
	 * @param metadata - The metadata to set for the log.
	 * @returns The log instance for method chaining.
	 */
	setMetadata(metadata: Metadata): BaseLog

	/**
	 * Adds an evaluator to the log.
	 *
	 * @param evaluator - The evaluator to add to the log.
	 * @returns The log instance for method chaining.
	 */
	addEvaluator(evaluator: Evaluator): BaseLog

	/**
	 * Updates the log with new parameters.
	 *
	 * @param params - The parameters to update.
	 * @returns The log instance for method chaining.
	 */
	update(params: UpdateParams): BaseLog

	/**
	 * Marks the log as ended.
	 *
	 * @returns The log instance for method chaining.
	 */
	end(): BaseLog
}
