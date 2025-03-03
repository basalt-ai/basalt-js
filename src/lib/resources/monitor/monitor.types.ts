import { Generation, GenerationParams } from './generation.types';
import { Span, SpanParams } from './span.types';
import { Trace, TraceParams } from './trace.types'

/**
 * @preserve
 * Interface for interacting with Basalt monitoring.
 * 
 * The MonitorSDK provides methods to create and manage traces, generations, and spans
 * for monitoring and tracking AI application flows.
 * 
 * @example
 * ```typescript
 * const monitorSDK: IMonitorSDK = ...; // Assume this is initialized
 * 
 * // Example 1: Creating a trace
 * const trace = monitorSDK.createTrace('user-session', {
 *   input: 'User started a new session',
 *   metadata: { userId: '123', sessionType: 'web' }
 * });
 * 
 * // Example 2: Creating a generation within a trace
 * const generation = monitorSDK.createGeneration({
 *   name: 'text-completion',
 *   prompt: { slug: 'text-completion-prompt', version: '1.0.0' },
 *   input: 'Tell me a joke',
 *   trace: trace
 * });
 * 
 * // Example 3: Creating a span for a processing step
 * const span = monitorSDK.createSpan({
 *   name: 'data-processing',
 *   type: 'process',
 *   trace: trace,
 *   metadata: { processingType: 'text-analysis' }
 * });
 * ```
 */
export interface IMonitorSDK {
	/**
	 * Creates a new trace to monitor a complete user interaction or process flow.
	 * 
	 * @param slug - A unique identifier for the trace, typically representing the type of interaction.
	 * @param params - Optional parameters for the trace.
	 *    - input: Initial input data for the trace.
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
	 * const basicTrace = monitorSDK.createTrace('user-query');
	 * 
	 * // Create a trace with parameters
	 * const detailedTrace = monitorSDK.createTrace('document-processing', {
	 *   input: 'Raw document text',
	 *   startTime: new Date(),
	 *   user: { id: 'user-123', name: 'John Doe' },
	 *   metadata: { documentId: 'doc-456', documentType: 'invoice' }
	 * });
	 * ```
	 * 
	 * @returns A Trace object that can be used to track the process flow.
	 */
	createTrace(slug: string, params?: TraceParams): Trace;

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
	 *    - parent: Optional parent span if this generation is part of a span.
	 * 
	 * @example
	 * ```typescript
	 * // Create a generation with a prompt reference
	 * const generation = monitorSDK.createGeneration({
	 *   name: 'answer-generation',
	 *   trace: trace,
	 *   prompt: { slug: 'qa-prompt', version: '2.1.0' },
	 *   input: 'What is the capital of France?',
	 *   variables: { style: 'concise', language: 'en' },
	 *   metadata: { modelVersion: 'gpt-4' }
	 * });
	 * 
	 * // Create a generation without a prompt reference
	 * const simpleGeneration = monitorSDK.createGeneration({
	 *   name: 'text-completion',
	 *   trace: trace,
	 *   input: 'Complete this sentence: The sky is',
	 *   output: 'The sky is blue and vast.'
	 * });
	 * ```
	 * 
	 * @returns A Generation object that can be used to track the AI generation.
	 */
	createGeneration(params: GenerationParams): Generation;

	/**
	 * Creates a new span to track a specific operation or step within a trace.
	 * 
	 * @param params - Parameters for the span.
	 *    - name: Name of the span (required).
	 *    - trace: The parent trace this span belongs to (required).
	 *    - type: Type of operation being performed (e.g., 'process', 'validation').
	 *    - input: The input data for this operation.
	 *    - startTime: When the span started.
	 *    - endTime: When the span completed.
	 *    - metadata: Additional contextual information.
	 *    - parent: Optional parent span if this is a nested span.
	 * 
	 * @example
	 * ```typescript
	 * // Create a basic span
	 * const basicSpan = monitorSDK.createSpan({
	 *   name: 'data-fetching',
	 *   trace: trace,
	 *   type: 'io'
	 * });
	 * 
	 * // Create a detailed span
	 * const detailedSpan = monitorSDK.createSpan({
	 *   name: 'user-validation',
	 *   trace: trace,
	 *   type: 'validation',
	 *   input: 'user credentials',
	 *   metadata: { validationRules: ['password-strength', 'email-format'] },
	 *   parent: parentSpan // Another span this is nested under
	 * });
	 * ```
	 * 
	 * @returns A Span object that can be used to track the operation.
	 */
	createSpan(params: SpanParams): Span;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Metadata = Record<string, any>