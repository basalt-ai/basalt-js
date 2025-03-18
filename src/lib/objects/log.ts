import { BaseLog } from './base-log'
import Generation from './generation'

import {
	CreateGenerationParams,
	CreateLogParams,
	Log as ILog,
	LogParams,
	hasPrompt,
} from '../resources'

export default class Log extends BaseLog implements ILog {
	private _input: string | undefined
	private _output: string | undefined

	constructor(params: LogParams) {
		super(params)

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

		// Set the trace of the generation to the current log
		generation.trace = this.trace
		generation.options = { type: 'multi' }

		// Set the parent of the generation to the current log
		generation.parent = this

		return this
	}

	public createGeneration(params: CreateGenerationParams) {
		const generation = new Generation({
			...params,
			name: hasPrompt(params) ? params.prompt.slug : params.name,
			trace: this.trace,
			parent: this,
		})
		generation.start(params.input)

		return generation
	}

	public createLog(params: CreateLogParams) {
		const log = new Log({
			...params,
			trace: this.trace,
			parent: this,
		})
		log.start(params.input)

		return log
	}
}
