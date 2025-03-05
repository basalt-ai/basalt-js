import { Metadata } from './monitor.types'
import { Span } from './span.types';
import { Trace } from './trace.types'

/**
 * Parameters required to create or update a log entry.
 * 
 * A log is the base entity for all monitoring activities and provides
 * common properties shared by spans and generations.
 * 
 * @example
 * ```typescript
 * // Basic log parameters
 * const params: LogParams = {
 *   name: 'operation-log',
 *   trace: trace,
 *   startTime: new Date(),
 *   metadata: { source: 'api-request' }
 * };
 * 
 * // Log parameters with parent span
 * const nestedParams: LogParams = {
 *   name: 'nested-operation',
 *   trace: trace,
 *   parent: parentSpan,
 *   metadata: { priority: 'high' }
 * };
 * ```
 * 
 * @preserve
 */
export interface LogParams {
	/**
	 * Name of the log entry, describing what it represents.
	 */
	name: string;
	
	/**
	 * When the log entry started, can be a Date object or ISO string.
	 * If not provided, defaults to the current time when created.
	 */
	startTime?: Date | string | undefined;
	
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
	parent?: Span | undefined;

	/**
	 * The trace this log belongs to, providing the overall context.
	 * Every log must be associated with a trace.
	 */
	trace: Trace;
}

/**
 * Parameters that can be updated on an existing log.
 * The trace cannot be changed after creation.
 * 
 * @example
 * ```typescript
 * // Update parameters for a log
 * const updateParams: UpdateParams = {
 *   name: 'renamed-operation',
 *   metadata: { status: 'completed', duration: '120ms' }
 * };
 * ```
 * 
 * @preserve
 */
export type UpdateParams = Partial<Omit<LogParams, 'trace'>>

/**
 * Log interface representing a basic monitoring entity.
 * 
 * Logs are the foundation of the monitoring system and track individual
 * operations or events within a trace. Both spans and generations extend
 * from this base interface.
 * 
 * @example
 * ```typescript
 * // Create a log
 * const log = createLog({
 *   name: 'operation-log',
 *   trace: trace
 * });
 * 
 * // Start the log
 * log.start();
 * 
 * // Add metadata
 * log.setMetadata({
 *   operation: 'data-processing',
 *   source: 'user-request'
 * });
 * 
 * // Update the log
 * log.update({
 *   name: 'renamed-operation'
 * });
 * 
 * // End the log
 * log.end();
 * ```
 * 
 * @preserve
 */
export interface Log extends LogParams {
	/**
	 * Unique identifier for this log entry.
	 * Automatically generated when the log is created.
	 */
	id: string;
	
	/**
	 * The type of log entry (e.g., 'span', 'generation').
	 * Used to distinguish between different kinds of logs.
	 */
	type: string
	
	/**
	 * Additional contextual information about this log entry.
	 * Can be any structured data relevant to the operation being logged.
	 */
	metadata?: Record<string, unknown> | undefined

	/**
	 * Marks the log as started and sets the startTime if not already set.
	 * 
	 * @returns The log instance for method chaining.
	 * 
	 * @example
	 * ```typescript
	 * // Start a log
	 * log.start();
	 * ```
	 */
	start(): Log
	
	/**
	 * Sets or updates the metadata for this log entry.
	 * 
	 * @param metadata - The metadata to associate with this log.
	 * @returns The log instance for method chaining.
	 * 
	 * @example
	 * ```typescript
	 * // Set metadata on a log
	 * log.setMetadata({
	 *   operation: 'data-processing',
	 *   source: 'user-request',
	 *   priority: 'high'
	 * });
	 * ```
	 */
	setMetadata(metadata: Metadata): Log
	
	/**
	 * Updates the log with new parameters.
	 * 
	 * @param params - The parameters to update.
	 * @returns The log instance for method chaining.
	 * 
	 * @example
	 * ```typescript
	 * // Update log parameters
	 * log.update({
	 *   name: 'renamed-operation',
	 *   metadata: { status: 'in-progress' }
	 * });
	 * ```
	 */
	update(params: UpdateParams): Log
	
	/**
	 * Marks the log as ended and sets the endTime if not already set.
	 * 
	 * @returns The log instance for method chaining.
	 * 
	 * @example
	 * ```typescript
	 * // End a log
	 * log.end();
	 * ```
	 */
	end(): Log
}
