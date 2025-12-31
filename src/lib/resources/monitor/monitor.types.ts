import { ExperimentParams } from './experiment.types'

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
}

export type Metadata = Record<string, unknown>
