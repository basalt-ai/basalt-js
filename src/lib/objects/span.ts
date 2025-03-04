import Generation from './generation';
import { Log } from './log'

import {
	CreateGenerationParams,
	CreateSpanParams,
	Span as ISpan,
	SpanParams,
	hasPrompt
} from '../resources'

export default class Span extends Log implements ISpan {
	private _input: string | undefined;
	private _output: string | undefined

	constructor(params: SpanParams) {
		super(params.type ?? 'span', params)

		this._input = params.input
	}

	/* --------------------------------- Getters -------------------------------- */
	public get input() {
		return this._input
	}

	public get output() {
		return this._output
	}

	/* ----------------------------- Public methods ----------------------------- */
	public override start(input?: string) {
		if (input) {
			this._input = input
		}

		super.start()

		return this
	}

	public override end(output?: string) {
		super.end()

		if (output) {
			this._output = output
		}

		return this
	}

	public append(generation: Generation) {
		// Remove child log from the list of its previous trace
		generation.trace.logs = generation.trace.logs.filter(log => log.id !== generation.id)

		// Add child to the new trace list
		this.trace.logs.push(generation)

		return this
	}

	public createGeneration(params: CreateGenerationParams) {
		const generation = new Generation({
			...params,
			name: hasPrompt(params) ? params.prompt.slug : params.name,
			trace: this.trace,
			parent: this
		})

		return generation
	}

	public createSpan(params: CreateSpanParams) {
		const span = new Span({
			...params,
			type: params.type ?? 'span',
			trace: this.trace,
			parent: this
		})

		return span
	}
}
