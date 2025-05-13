import { BaseLog } from './base-log.types'
import { EvaluationConfig, Evaluator } from './evaluator.types'
import { Experiment } from './experiment.types'
import { CreateGenerationParams, Generation } from './generation.types'
import { CreateLogParams, Log } from './log.types'
import { Metadata } from './monitor.types'

/**
 * Parameters for creating or updating a trace.
 *
 * A trace represents a complete user interaction or process flow and serves
 * as the top-level container for all monitoring activities.
 *
 * @preserve
 */
export interface TraceParams {
	/**
	 * Optional name for the trace, describing what it represents.
	 * If not provided, defaults to the slug used when creating the trace.
	 */
	name?: string | undefined

	/**
	 * Initial input data for the trace, typically the user's query or request.
	 */
	input?: string | undefined

	/**
	 * Final output data for the trace, typically the response provided to the user.
	 * Can be set later using the end() method.
	 */
	output?: string | undefined

	/**
	 * When the trace started, can be a Date object or ISO string.
	 * If not provided, defaults to the current time when created.
	 */
	startTime?: Date | string | undefined

	/**
	 * When the trace ended, can be a Date object or ISO string.
	 * Can be set later using the end() method.
	 */
	endTime?: Date | string | undefined

	/**
	 * User information associated with this trace.
	 * Used for attribution and analysis of user interactions.
	 */
	user?: User | undefined

	/**
	 * Organization information associated with this trace.
	 * Used for multi-tenant systems to track organization-specific usage.
	 */
	organization?: Organization | undefined

	/**
	 * Additional contextual information for the trace.
	 * Can be any structured data relevant to the process being traced.
	 */
	metadata?: Metadata | undefined

	/**
	 * Experiment to attach the trace to.
	 * This is used to log the trace into a specific experiment instead of in the monitoring.
	 */
	experiment?: Experiment | undefined

	/**
	 * Evaluators that will run on the trace (only on the trace, not on the logs).
	 *
	 * To run evaluators on the logs, use the `evaluators` property of the log.
	 */
	evaluators?: Evaluator[] | undefined

	/**
	 * Configuration for the evaluation of the trace and its logs.
	 */
	evaluationConfig?: EvaluationConfig | undefined
}

/**
 * Trace interface representing a complete user interaction or process flow.
 *
 * A trace is the top-level container for all monitoring activities and provides
 * methods to create and manage spans and generations within the process flow.
 *
 * @example
 * ```typescript
 * // Create a basic trace
 * const trace = monitorSDK.createTrace('user-query');
 *
 * // Start the trace with input
 * trace.start('What is the capital of France?');
 *
 * // Create a span within the trace
 * const processingLog = trace.createLog({
 *   name: 'query-processing',
 *   type: 'process'
 * });
 *
 * // Create a generation within the span
 * const generation = processingLog.createGeneration({
 *   name: 'answer-generation',
 *   prompt: { slug: 'qa-prompt', version: '1.0.0' },
 *   input: 'What is the capital of France?'
 * });
 *
 * // End the generation with output
 * generation.end('The capital of France is Paris.');
 *
 * // End the span
 * processingLog.end();
 *
 * // End the trace with final output
 * trace.end('Paris is the capital of France.');
 * ```
 *
 * @preserve
 */
export interface Trace extends TraceParams {
	/**
	 * When the trace started, always available as a Date object.
	 */
	startTime: Date

	/**
	 * Collection of all logs (spans and generations) associated with this trace.
	 */
	logs: BaseLog[]

	/* --------------------------------- Methods -------------------------------- */
	/**
	 * Marks the trace as started and sets the input if provided.
	 *
	 * @param input - Optional input data to associate with the trace.
	 * @returns The trace instance for method chaining.
	 *
	 * @example
	 * ```typescript
	 * // Start a trace without input
	 * trace.start();
	 *
	 * // Start a trace with input
	 * trace.start('User query: What is the capital of France?');
	 * ```
	 */
	start(input?: string): Trace

	/**
	 * Sets or updates the metadata for this trace.
	 *
	 * @param metadata - The metadata to associate with this trace.
	 * @returns The trace instance for method chaining.
	 *
	 * @example
	 * ```typescript
	 * // Add metadata to the trace
	 * trace.setMetadata({
	 *   userId: 'user-123',
	 *   sessionId: 'session-456',
	 *   source: 'web-app'
	 * });
	 * ```
	 */
	setMetadata(metadata: Metadata): Trace

	/**
	 * Sets the evaluation configuration for the trace.
	 *
	 * @param config - The evaluation configuration to set.
	 * @returns The trace instance for method chaining.
	 */
	setEvaluationConfig(config: EvaluationConfig): Trace

	/**
	 * Sets the experiment for the trace.
	 *
	 * @param experiment - The experiment to set.
	 * @returns The trace instance for method chaining.
	 */
	setExperiment(experiment: Experiment): Trace

	/**
	 * Updates the trace with new parameters.
	 * The new parameters given in this method will override the existing ones.
	 *
	 * @param params - The parameters to update.
	 * @returns The trace instance for method chaining.
	 *
	 * @example
	 * ```typescript
	 * // Update trace parameters
	 * trace.update({
	 *   name: 'Updated trace name',
	 *   metadata: { priority: 'high' }
	 * });
	 * ```
	 */
	update(params: Partial<TraceParams>): Trace

	/**
	 * Adds an evaluator to the trace.
	 *
	 * @param evaluator - The evaluator to add to the trace.
	 * @returns The trace instance for method chaining.
	 */
	addEvaluator(evaluator: Evaluator): Trace

	/**
	 * Adds a log (span or generation) to this trace.
	 *
	 * @param log - The log to add to this trace.
	 * @returns The trace instance for method chaining.
	 *
	 * @example
	 * ```typescript
	 * // Create a generation separately and append it to the trace
	 * const generation = monitorSDK.createGeneration({
	 *   name: 'external-generation',
	 *   trace: anotherTrace
	 * });
	 *
	 * // Append the generation to this trace
	 * trace.append(generation);
	 * ```
	 */
	append(log: BaseLog): Trace

	/**
	 * Associates user information with this trace.
	 *
	 * @param params - The user and organization information to associate with this trace.
	 * @returns The trace instance for method chaining.
	 *
	 * @example
	 * ```typescript
	 * // Identify a user with user and organization information
	 * trace.identify({
	 *   user: {
	 *     id: 'user-123',
	 *     name: 'John Doe',
	 *     email: 'john@example.com'
	 *   },
	 *   organization: {
	 *     id: 'org-123',
	 *     name: 'Acme Corporation'
	 *   }
	 * });
	 * ```
	 */
	identify(params: IdentifyParams): Trace

	/**
	 * Creates a new generation within this trace.
	 *
	 * @param params - Parameters for the generation.
	 * @returns A new Generation instance associated with this trace.
	 *
	 * @example
	 * ```typescript
	 * // Create a generation with a prompt reference
	 * const generation = trace.createGeneration({
	 *   name: 'answer-generation',
	 *   prompt: { slug: 'qa-prompt', version: '2.1.0' },
	 *   input: 'What is the capital of France?',
	 *   variables: { style: 'concise', language: 'en' },
	 *   metadata: { modelVersion: 'gpt-4' }
	 * });
	 *
	 * // Create a generation without a prompt reference
	 * const simpleGeneration = trace.createGeneration({
	 *   name: 'text-completion',
	 *   input: 'Complete this sentence: The sky is',
	 *   output: 'The sky is blue and vast.'
	 * });
	 * ```
	 */
	createGeneration(params: CreateGenerationParams): Generation

	/**
	 * Creates a new span within this trace.
	 *
	 * @param params - Parameters for the span.
	 * @returns A new Log instance associated with this trace.
	 *
	 * @example
	 * ```typescript
	 * // Create a basic span
	 * const basicLog = trace.createLog({
	 *   name: 'data-fetching',
	 *   type: 'io'
	 * });
	 *
	 * // Create a detailed span
	 * const detailedLog = trace.createLog({
	 *   name: 'user-validation',
	 *   input: 'user credentials',
	 *   metadata: { validationRules: ['password-strength', 'email-format'] }
	 * });
	 * ```
	 */
	createLog(params: CreateLogParams): Log

	/**
	 * Marks the trace as ended and sets the output if provided.
	 *
	 * @param output - Optional output data to associate with the trace.
	 * @returns The trace instance for method chaining.
	 *
	 * @example
	 * ```typescript
	 * // End a trace without output
	 * trace.end();
	 *
	 * // End a trace with output
	 * trace.end('The capital of France is Paris.');
	 * ```
	 */
	end(output?: string): Trace
}

/**
 * Organization information associated with a trace.
 *
 * Used in multi-tenant systems to track organization-specific usage.
 *
 * @example
 * ```typescript
 * const organization = {
 *   id: 'org-123',
 *   name: 'Acme Corporation',
 *   plan: 'enterprise'
 * };
 *
 * // Create a trace with organization information
 * const trace = monitorSDK.createTrace('user-query', {
 *   organization: organization
 * });
 * ```
 *
 * @preserve
 */
export interface Organization {
	/**
	 * Allows for additional custom properties.
	 */
	[key: string]: string

	/**
	 * Unique identifier for the organization.
	 */
	id: string

	/**
	 * Display name of the organization.
	 */
	name: string
}

/**
 * User information associated with a trace.
 *
 * Used for attribution and analysis of user interactions.
 *
 * @example
 * ```typescript
 * const user = {
 *   id: 'user-123',
 *   name: 'John Doe',
 *   email: 'john@example.com'
 * };
 *
 * // Create a trace with user information
 * const trace = monitorSDK.createTrace('user-query', {
 *   user: user
 * });
 *
 * // Or add user information later
 * trace.identify(user);
 * ```
 *
 * @preserve
 */
export interface User {
	/**
	 * Allows for additional custom properties.
	 */
	[key: string]: string

	/**
	 * Unique identifier for the user.
	 */
	id: string

	/**
	 * Display name of the user.
	 */
	name: string
}

/**
 * Parameters for identifying a user in a trace.
*/
export interface IdentifyParams {
	user?: User
	organization?: Organization
}
