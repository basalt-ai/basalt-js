import { Log } from './log'

import {
	GenerationParams, GenerationPrompt, GenerationVariable, Generation as IGeneration,
	UpdateGenerationParams
} from '../resources/monitor/generation.types'

export default class Generation extends Log implements IGeneration {
	private _prompt: GenerationPrompt | undefined
	private _input: string | undefined
	private _variables: GenerationVariable | undefined
	private _output: string | undefined

	constructor(params: GenerationParams) {
		super('generation', params)

		this._prompt = params.prompt
		this._input = params.input
		this._output = params.output
	}

	/* --------------------------------- Getters -------------------------------- */
	public get prompt() {
		return this._prompt
	}

	public get input() {
		return this._input
	}

	public get output() {
		return this._output
	}

	public get variables() {
		return this._variables
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

	public override update(params: UpdateGenerationParams) {
		this._input = params.input ?? this._input
		this._output = params.output ?? this._output

		super.update(params)

		return this
	}
}
