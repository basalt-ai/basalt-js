import { BaseLog } from './base-log'
import Generation from './generation'
import Log from './log'

import {
	CreateGenerationParams,
	CreateLogParams,
	Trace as ITrace,
	IdentifyParams,
	Metadata,
	Organization,
	TraceParams,
	User,
	hasPrompt,
} from '../resources'
import Flusher from '../utils/flusher'
export class Trace implements ITrace {
	private _chainSlug: string

	private _input: string | undefined
	private _output: string | undefined
	private _name: string | undefined
	private _startTime: Date
	private _endTime: Date | undefined
	private _user: User | undefined
	private _organization: Organization | undefined
	private _metadata: Metadata | undefined
	private _flushedPromise: Promise<void> | undefined

	private _logs: BaseLog[] = []

	private _flusher: Flusher

	constructor(slug: string, params: TraceParams = {}, flusher: Flusher) {
		this._chainSlug = slug

		this._user = params.user
		this._organization = params.organization
		this._metadata = params.metadata
		this._input = params.input
		this._output = params.output
		this._name = params.name
		this._startTime = params.startTime ? new Date(params.startTime) : new Date()
		this._endTime = params.endTime ? new Date(params.endTime) : undefined

		this._flusher = flusher
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

	set logs(logs: BaseLog[]) {
		this._logs = logs
	}

	get chainSlug() {
		return this._chainSlug
	}

	get endTime() {
		return this._endTime
	}

	/* ----------------------------- Public methods ----------------------------- */
	public start(input?: string) {
		if (input) {
			this._input = input
		}

		this._startTime = new Date()

		return this
	}

	public identify(params: IdentifyParams): Trace {
		this._user = params.user
		this._organization = params.organization

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
		this._name = params.name ?? this._name

		return this
	}

	public append(generation: Generation) {
		// Remove child log from the list of its previous trace
		generation.trace.logs = generation.trace.logs.filter(l => l.id !== generation.id)

		// Add child to the new trace list
		this._logs.push(generation)

		return this
	}

	public createGeneration(params: CreateGenerationParams) {
		const generation = new Generation({
			...params,
			name: hasPrompt(params) ? params.prompt.slug : params.name,
			trace: this,
		})
		generation.start(params.input)

		return generation
	}

	public createLog(params: CreateLogParams) {
		const log = new Log({
			...params,
			trace: this,
		})
		log.start(params.input)

		return log
	}

	public end(output?: string) {
		this._output = output ?? this._output
		this._endTime = new Date()

		// Send to the API
		// This is handled by the SDK instance that created this trace
		// The SDK will use the SendTraceEndpoint to send the trace to the API
		if (!this._flushedPromise) {
			void this._flusher.flushTrace(this)
		}

		return this
	}
}
