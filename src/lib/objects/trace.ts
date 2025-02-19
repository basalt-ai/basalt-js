import Generation from './generation'

import Span from './span'

import {
	CreateGenerationParams,
	CreateSpanParams,
	Trace as ITrace,
	Log,
	Metadata,
	Organization,
	TraceParams,
	User,
	hasPrompt
} from '../ressources'

export class Trace implements ITrace {
	private _featureSlug: string

	private _input: string | undefined
	private _output: string | undefined
	private _startTime: Date
	private _endTime: Date | undefined
	private _user: User | undefined
	private _organization: Organization | undefined
	private _metadata: Metadata | undefined

	private _logs: Log[] = []

	constructor(slug: string, params: TraceParams = {}) {
		this._featureSlug = slug

		this._user = params.user
		this._organization = params.organization
		this._metadata = params.metadata

		this._startTime = params.startTime ? new Date(params.startTime) : new Date()
		this._endTime = params.endTime ? new Date(params.endTime) : undefined
	}

	/* --------------------------------- Getters -------------------------------- */
	get input() {
		return this._input
	}

	get output() {
		return this._output
	}

	get startTime() {
		return this._startTime
	}

	get user() {
		return this._user
	}

	get organization() {
		return this._organization
	}

	get metadata() {
		return this._metadata
	}

	get logs() {
		return this._logs
	}

	set logs(logs: Log[]) {
		this._logs = logs
	}

	/* ----------------------------- Public methods ----------------------------- */
	public start(input?: string) {
		if (input) {
			this._input = input
		}

		this._startTime = new Date()

		return this
	}

	public identify(id: string, params: Omit<User, 'id'>): Trace
	public identify(user: User): Trace
	public identify(arg1: string | User, arg2?: Omit<User, 'id'>): Trace {
		if (typeof arg1 === 'string') {
			this._user = {
				id: arg1,
				name: arg1,
				...arg2
			}
		} else {
			this._user = arg1
		}

		return this
	}

	public setMetadata(metadata: Metadata) {
		this._metadata = metadata

		return this
	}

	public update(params: TraceParams) {
		this._metadata = params.metadata ?? this._metadata
		this._input = params.input ?? this._input
		this._output = params.output ?? this._output
		this._organization = params.organization ?? this._organization
		this._user = params.user ?? this._user
		this._startTime = params.startTime ? new Date(params.startTime) : this._startTime
		this._endTime = params.endTime ? new Date(params.endTime) : this._endTime

		return this
	}

	public append(log: Log) {
		// Remove child log from the list of its previous trace
		log.trace.logs = log.trace.logs.filter(l => l.id !== log.id)

		// Change reference
		log.trace = this

		// Add child to the new trace list
		this._logs.push(log)

		return this
	}

	public createGeneration(params: CreateGenerationParams) {
		const generation = new Generation({
			...params,
			name: hasPrompt(params) ? params.prompt.slug : params.name,
			trace: this
		})

		return generation
	}

	public createSpan(params: CreateSpanParams) {
		const span = new Span({
			...params,
			type: params.type ?? 'span',
			trace: this
		})

		return span
	}

	public end(output?: string) {
		this._output = output ?? this._output
		this._endTime = new Date()

		// TODO send to the API
		console.log(this._endTime, this._featureSlug)

		return this
	}
}