export interface Evaluator {
	/**
	 * The slug of the evaluator.
	 */
	slug: string

	/**
	 * The parameters for the evaluator.
	 */
	parameters?: EvaluatorParameters | undefined
}

export interface EvaluatorParameters {
	/**
	 * The sample rate for the evaluator. This is the probability that the evaluator will be run.
	 * The value should be between 0 and 1.
	 * If not provided, the default will be 10%
	 */
	sampleRate?: number | undefined
}
