import { CreateGenerationParams, Generation } from './generation.types';
import { Log, LogParams } from './log.types'
import { Trace } from './trace.types';

/**
 * Parameters for creating a new span, excluding the trace which is provided by context.
 * 
 * @preserve
 */
export type CreateSpanParams = Omit<SpanParams, 'trace'>

/**
 * Span interface representing a specific operation or step within a trace.
 * 
 * Spans are used to track discrete operations within a process flow, such as
 * data fetching, validation, or any other logical step. Spans can contain
 * generations and can be nested within other spans to create a hierarchical
 * structure of operations.
 * 
 * @example
 * ```typescript
 * // Create a span within a trace
 * const span = trace.createSpan({
 *   name: 'data-processing',
 *   type: 'process'
 * });
 * 
 * // Start the span with input
 * span.start('Raw user data');
 * 
 * // Create a nested span for a sub-operation
 * const validationSpan = span.createSpan({
 *   name: 'data-validation',
 *   type: 'validation'
 * });
 * 
 * // Create a generation within the validation span
 * const generation = validationSpan.createGeneration({
 *   name: 'validation-check',
 *   prompt: { slug: 'data-validator', version: '1.0.0' },
 *   input: 'Raw user data'
 * });
 * 
 * // End the generation with output
 * generation.end('Data is valid');
 * 
 * // End the validation span
 * validationSpan.end('Validation complete');
 * 
 * // End the main span with processed output
 * span.end('Processed user data');
 * ```
 * 
 * @preserve
 */
export interface Span extends SpanParams, Log {
	/**
	 * The type of operation being performed (e.g., 'process', 'validation', 'io').
	 * Used to categorize different kinds of operations for analysis.
	 */
	type: string;
	
	/**
	 * The trace this span belongs to, providing the overall context.
	 */
	trace: Trace;

	/**
	 * Marks the span as started and sets the input if provided.
	 * 
	 * @param input - Optional input data to associate with the span.
	 * @returns The span instance for method chaining.
	 * 
	 * @example
	 * ```typescript
	 * // Start a span without input
	 * span.start();
	 * 
	 * // Start a span with input
	 * span.start('Raw user data to be processed');
	 * ```
	 */
	start(input?: string): Span;
	
	/**
	 * Marks the span as ended and sets the output if provided.
	 * 
	 * @param output - Optional output data to associate with the span.
	 * @returns The span instance for method chaining.
	 * 
	 * @example
	 * ```typescript
	 * // End a span without output
	 * span.end();
	 * 
	 * // End a span with output
	 * span.end('Processed data: { success: true, items: 42 }');
	 * ```
	 */
	end(output?: string): Span;

	/**
	 * Adds a generation to this span.
	 * 
	 * @param generation - The generation to add to this span.
	 * @returns The span instance for method chaining.
	 * 
	 * @example
	 * ```typescript
	 * // Create a generation separately
	 * const generation = monitorSDK.createGeneration({
	 *   name: 'external-generation',
	 *   trace: trace
	 * });
	 * 
	 * // Append the generation to this span
	 * span.append(generation);
	 * ```
	 */
	append(generation: Generation): Span

	/**
	 * Creates a new generation within this span.
	 * 
	 * @param params - Parameters for the generation.
	 * @returns A new Generation instance associated with this span.
	 * 
	 * @example
	 * ```typescript
	 * // Create a generation with a prompt reference
	 * const generation = span.createGeneration({
	 *   name: 'text-analysis',
	 *   prompt: { slug: 'text-analyzer', version: '1.2.0' },
	 *   input: 'Analyze this text for sentiment and key topics',
	 *   variables: { language: 'en', mode: 'detailed' },
	 *   metadata: { priority: 'high' }
	 * });
	 * 
	 * // Create a simple generation without a prompt reference
	 * const simpleGeneration = span.createGeneration({
	 *   name: 'quick-check',
	 *   input: 'Is this text appropriate?',
	 *   output: 'Yes, the text is appropriate for all audiences.'
	 * });
	 * ```
	 */
	createGeneration(params: CreateGenerationParams): Generation
	
	/**
	 * Creates a new nested span within this span.
	 * 
	 * @param params - Parameters for the nested span.
	 * @returns A new Span instance associated with this span as its parent.
	 * 
	 * @example
	 * ```typescript
	 * // Create a basic nested span
	 * const nestedSpan = span.createSpan({
	 *   name: 'sub-operation',
	 *   type: 'process'
	 * });
	 * 
	 * // Create a detailed nested span
	 * const detailedNestedSpan = span.createSpan({
	 *   name: 'data-transformation',
	 *   type: 'transform',
	 *   input: 'Raw data format',
	 *   metadata: { transformType: 'json-to-xml', preserveOrder: true }
	 * });
	 * ```
	 */
	createSpan(params: CreateSpanParams): Span
}

/**
 * Parameters for creating or updating a span.
 * 
 * @preserve
 */
export interface SpanParams extends LogParams {
	/**
	 * The type of operation being performed (e.g., 'process', 'validation', 'io').
	 * Used to categorize different kinds of operations for analysis.
	 */
	type?: string | undefined;
	
	/**
	 * The input data for this operation.
	 */
	input?: string | undefined;
}

// Type guards
/**
 * Type guard to check if a log is a span.
 * 
 * @param log - The log to check.
 * @returns True if the log is a span, false otherwise.
 * 
 * @example
 * ```typescript
 * // Check if a log is a span before using span-specific methods
 * if (isSpan(log)) {
 *   // Now TypeScript knows this is a Span
 *   log.createSpan({ name: 'nested-operation' });
 * }
 * ```
 */
export function isSpan(log: Log): log is Span {
	return log.type === 'span'
}
