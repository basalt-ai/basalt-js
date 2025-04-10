import { BaseLog } from './base-log'

import {
	GenerationOptions,
	GenerationParams,
	GenerationPrompt,
	GenerationVariable,
	Generation as IGeneration,
	UpdateGenerationParams,
} from '../resources/monitor/generation.types'

export default class Generation extends BaseLog implements IGeneration {
	private _prompt: GenerationPrompt | undefined
	private _input: string | undefined
	private _variables: GenerationVariable | undefined
	private _output: string | undefined
	private _options: GenerationOptions | undefined
	private _inputTokens: number | undefined
	private _outputTokens: number | undefined
	private _cost: number | undefined

	constructor(params: GenerationParams, options?: GenerationOptions) {
		super({
			type: 'generation',
			...params,
		})

		this._prompt = params.prompt
		this._input = params.input
		this._output = params.output
		this._variables = params.variables
		this._inputTokens = params.inputTokens
		this._outputTokens = params.outputTokens
		this._cost = params.cost
		this._options = options
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

	public set options(options: GenerationOptions) {
		this._options = options
	}

	public get inputTokens() {
		return this._inputTokens
	}

	public set inputTokens(inputTokens: number | undefined) {
		this._inputTokens = inputTokens
	}

	public get outputTokens() {
		return this._outputTokens
	}

	public set outputTokens(outputTokens: number | undefined) {
		this._outputTokens = outputTokens
	}

	public get cost() {
		return this._cost ?? 0
	}

	public set cost(cost: number) {
		this._cost = cost
	}

	/* ----------------------------- Public methods ----------------------------- */
	public override start(input?: string) {
		if (input) {
			this._input = input
		}

		super.start()

		return this
	}

	public override end(param?: string | UpdateGenerationParams) {
		super.end()

		if (typeof param === 'string') {
			this._output = param
			if (this._options?.type === 'single') {
				this.trace.end(param)
			}
		}
		else if (param) {
			this.update(param)
			if (this._options?.type === 'single') {
				this.trace.end(param.output)
			}
		}

		return this
	}

	public override update(params: UpdateGenerationParams) {
		this._input = params.input ?? this._input
		this._output = params.output ?? this._output
		this._prompt = params.prompt ?? this._prompt
		this._inputTokens = params.inputTokens ?? this._inputTokens
		this._outputTokens = params.outputTokens ?? this._outputTokens
		this._cost = params.cost ?? this._cost

		super.update(params)

		return this
	}
}
