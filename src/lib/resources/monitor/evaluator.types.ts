export interface Evaluator {
	/**
	 * The slug of the evaluator.
	 */
	slug: string
}

/**
 * Configuration for the evaluation of the trace and its logs.
*/
export interface EvaluationConfig {
	/**
	 * The sample rate for the evaluation of the trace.
	 * This rate is applied to the whole trace with its logs. That means that either all the logs are evaluated or none.
	 *
	 * This is the probability that the evaluator will be run.
	 * The value must be between 0 and 1.
	 * If not provided, the default will be 10%.
	 *
	 * This is not applied for experimentations where the sample rate is always set to 100%.
	 */
	sampleRate?: number | undefined
}
