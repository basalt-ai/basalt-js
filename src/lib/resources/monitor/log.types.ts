import { BaseLog, BaseLogParams, LogType } from './base-log.types'
import { CreateGenerationParams, Generation } from './generation.types'
import { Trace } from './trace.types'

/**
 * Parameters for creating a new log, excluding the trace which is provided by context.
 *
 * @preserve
 */
export type CreateLogParams = Omit<LogParams, 'trace'>

/**
 * Log interface representing a specific operation or step within a trace.
 *
 * Logs are used to track discrete operations within a process flow, such as
 * data fetching, validation, or any other logical step. Logs can contain
 * generations and can be nested within other logs to create a hierarchical
 * structure of operations.
 *
 * @example
 * ```typescript
 * // Create a log within a trace
 * const log = trace.createLog({
 *   name: 'data-processing',
 * });
 *
 * // Start the log with input
 * log.start('Raw user data');
 *
 * // Create a nested log for a sub-operation
 * const validationLog = log.createLog({
 *   name: 'data-validation',
 * });
 *
 * // Create a generation within the validation log
 * const generation = validationLog.createGeneration({
 *   name: 'validation-check',
 *   prompt: { slug: 'data-validator', version: '1.0.0' },
 *   input: 'Raw user data'
 * });
 *
 * // End the generation with output
 * generation.end('Data is valid');
 *
 * // End the validation log
 * validationLog.end('Validation complete');
 *
 * // End the main log with processed output
 * log.end('Processed user data');
 * ```
 *
 * @preserve
 */
export interface Log extends LogParams, BaseLog {
	/**
	 * The trace this log belongs to, providing the overall context.
	 */
	trace: Trace

	/**
	 * Marks the log as started and sets the input if provided.
	 *
	 * @param input - Optional input data to associate with the log.
	 * @returns The log instance for method chaining.
	 *
	 * @example
	 * ```typescript
	 * // Start a log without input
	 * log.start();
	 *
	 * // Start a log with input
	 * log.start('Raw user data to be processed');
	 * ```
	 */
	start(input?: string): Log

	/**
	 * Marks the log as ended and sets the output if provided.
	 *
	 * @param output - Optional output data to associate with the log.
	 * @returns The log instance for method chaining.
	 *
	 * @example
	 * ```typescript
	 * // End a log without output
	 * log.end();
	 *
	 * // End a log with output
	 * log.end('Processed data: { success: true, items: 42 }');
	 * ```
	 */
	end(output?: string): Log

	/**
	 * Adds a generation to this log.
	 *
	 * @param generation - The generation to add to this log.
	 * @returns The log instance for method chaining.
	 *
	 * @example
	 * ```typescript
	 * // Create a generation separately
	 * const generation = monitorSDK.createGeneration({
	 *   name: 'external-generation',
	 *   trace: trace
	 * });
	 *
	 * // Append the generation to this log
	 * log.append(generation);
	 * ```
	 */
	append(generation: Generation): Log

	/**
	 * Creates a new generation within this log.
	 *
	 * @param params - Parameters for the generation.
	 * @returns A new Generation instance associated with this log.
	 *
	 * @example
	 * ```typescript
	 * // Create a generation with a prompt reference
	 * const generation = log.createGeneration({
	 *   name: 'text-analysis',
	 *   prompt: { slug: 'text-analyzer', version: '1.2.0' },
	 *   input: 'Analyze this text for sentiment and key topics',
	 *   variables: { language: 'en', mode: 'detailed' },
	 *   metadata: { priority: 'high' }
	 * });
	 *
	 * // Create a simple generation without a prompt reference
	 * const simpleGeneration = log.createGeneration({
	 *   name: 'quick-check',
	 *   input: 'Is this text appropriate?',
	 *   output: 'Yes, the text is appropriate for all audiences.'
	 * });
	 * ```
	 */
	createGeneration(params: CreateGenerationParams): Generation

	/**
	 * Creates a new nested log within this log.
	 *
	 * @param params - Parameters for the nested log.
	 * @returns A new Log instance associated with this log as its parent.
	 *
	 * @example
	 * ```typescript
	 * // Create a basic nested log
	 * const nestedLog = log.createLog({
	 *   name: 'sub-operation',
	 * });
	 *
	 * // Create a detailed nested log
	 * const detailedNestedLog = log.createLog({
	 *   name: 'data-transformation',
	 *   input: 'Raw data format',
	 *   metadata: { transformType: 'json-to-xml', preserveOrder: true }
	 * });
	 * ```
	 */
	createLog(params: CreateLogParams): Log
}

/**
 * Parameters for creating or updating a log.
 *
 * @preserve
 */
export interface LogParams extends BaseLogParams {
	/**
	 * The type of log entry (e.g., 'span', 'generation').
	 * Used to distinguish between different kinds of logs.
	 */
	type: LogType

	/**
	 * The input data for this operation.
	 */
	input?: string | undefined

	/**
	 * The output generated by the model.
	 */
	output?: string
}
