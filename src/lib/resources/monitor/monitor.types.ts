import { ExperimentParams } from './experiment.types'
import { Generation, GenerationParams } from './generation.types'
import { Log, LogParams } from './log'
import { Trace, TraceParams } from './trace.types'

import { Experiment } from '../../objects/experiment'
import { AsyncResult } from '../contract'

/**
 * @preserve
 * Interface for interacting with Basalt monitoring.
 *
 * The MonitorSDK provides methods to create and manage traces, generations, and logs
 * for monitoring and tracking AI application flows.
 *
 * @example
 * ```typescript
 * // Example 1: Creating a trace
 * const trace = basalt.monitor.createTrace('user-session', {
 *   input: 'User started a new session',
 *   metadata: { userId: '123', sessionType: 'web' }
 * });
 *
 * // Example 2: Creating a generation within a trace
 * const generation = basalt.monitor.createGeneration({
 *   name: 'text-completion',
 *   prompt: { slug: 'text-completion-prompt', version: '1.0.0' },
 *   input: 'Tell me a joke',
 *   trace: trace
 * });
 *
 * // Example 3: Creating a span for a processing step
 * const span = basalt.monitor.createLog({
 *   type: 'span',
 *   name: 'data-processing',
 *   trace: trace,
 *   metadata: { processingType: 'text-analysis' }
 * });
 * ```
 */
export interface IMonitorSDK {
	/**
	 * Creates a new experiment to bundle multiple traces together in.
	 * You can pass this experiment to the `createTrace` method to add the generated traces to the experiment.
	 * It's used mostly for local experimentations, to compare the performance between different versions of a workflow.
	 *
	 * @param featureSlug - The unique identifier of the feature to which the experiment belongs.
	 * @param params - Parameters for the experiment.
	 *    - name: Name of the experiment (required).
	 *
	 * @example
	 * ```typescript
	 * const experiment = basalt.monitor.createExperiment('user-query', { name: 'my-experiment' })
	 *
	 * // Create a trace and add it to the experiment
	 * const trace = basalt.monitor.createTrace('user-query', { experiment })
	 * ```
	 *
	 * @returns A Experiment object that can be used to track the AI generation.
	 */
	createExperiment(featureSlug: string, params: ExperimentParams): AsyncResult<Experiment>

	/**
	 * Creates a new trace to monitor a complete user interaction or process flow.
	 *
	 * @param featureSlug - The unique identifier of the feature to which the trace belongs.
	 * @param params - Optional parameters for the trace.
	 *    - output: Final output data for the trace.
	 *    - startTime: When the trace started (defaults to now if not provided).
	 *    - endTime: When the trace ended.
	 *    - user: User information associated with this trace.
	 *    - organization: Organization information associated with this trace.
	 *    - metadata: Additional contextual information for the trace.
	 *
	 * @example
	 * ```typescript
	 * // Create a basic trace
	 * const basicTrace = basalt.monitor.createTrace('user-query');
	 *
	 * // Create a trace with parameters
	 * const detailedTrace = basalt.monitor.createTrace('document-processing', {
	 *   input: 'Raw document text',
	 *   startTime: new Date(),
	 *   user: { id: 'user-123', name: 'John Doe' },
	 *   metadata: { documentId: 'doc-456', documentType: 'invoice' }
	 * });
	 * ```
	 *
	 * @returns A Trace object that can be used to track the process flow.
	 */
	createTrace(slug: string, params?: TraceParams): Trace

	/**
	 * Creates a new generation to track an AI model generation within a trace.
	 *
	 * @param params - Parameters for the generation.
	 *    - name: Name of the generation (required).
	 *    - trace: The parent trace this generation belongs to (required).
	 *    - prompt: Information about the prompt used for generation.
	 *      - slug: Prompt identifier.
	 *      - version: Prompt version.
	 *      - tag: Prompt tag.
	 *    - input: The input provided to the model.
	 *    - variables: Variables used in the prompt template.
	 *    - output: The output generated by the model.
	 *    - startTime: When the generation started.
	 *    - endTime: When the generation completed.
	 *    - metadata: Additional contextual information.
	 *    - parent: Optional parent log if this generation is part of a log.
	 *
	 * @example
	 * ```typescript
	 * // Create a generation with a prompt reference
	 * const generation = basalt.monitor.createGeneration({
	 *   name: 'answer-generation',
	 *   trace: trace,
	 *   prompt: { slug: 'qa-prompt', version: '2.1.0' },
	 *   input: 'What is the capital of France?',
	 *   variables: { style: 'concise', language: 'en' },
	 *   metadata: { modelVersion: 'gpt-4' }
	 * });
	 *
	 * // Create a generation without a prompt reference
	 * const simpleGeneration = basalt.monitor.createGeneration({
	 *   name: 'text-completion',
	 *   trace: trace,
	 *   input: 'Complete this sentence: The sky is',
	 *   output: 'The sky is blue and vast.'
	 * });
	 * ```
	 *
	 * @returns A Generation object that can be used to track the AI generation.
	 */
	createGeneration(params: GenerationParams): Generation

	/**
	 * Creates a new log to track a specific operation or step within a trace.
	 *
	 * @param params - Parameters for the log.
	 *    - name: Name of the log (required).
	 *    - trace: The parent trace this log belongs to (required).
	 *    - input: The input data for this operation.
	 *    - startTime: When the log started.
	 *    - endTime: When the log completed.
	 *    - metadata: Additional contextual information.
	 *    - parent: Optional parent log if this is a nested log.
	 *
	 * @example
	 * ```typescript
	 * // Create a basic log
	 * const basicLog = basalt.monitor.createLog({
	 *   name: 'data-fetching',
	 *   trace: trace,
	 * });
	 *
	 * // Create a detailed log
	 * const detailedLog = basalt.monitor.createLog({
	 *   name: 'user-validation',
	 *   trace: trace,
	 *   input: 'user credentials',
	 *   metadata: { validationRules: ['password-strength', 'email-format'] },
	 *   parent: parentLog // Another log this is nested under
	 * });
	 * ```
	 *
	 * @returns A Log object that can be used to track the operation.
	 */
	createLog(params: LogParams): Log
}

export type Metadata = Record<string, unknown>
