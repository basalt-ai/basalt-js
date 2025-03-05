import {
	Log as ILog,
	LogParams,
	Metadata,
	Span,
	Trace,
	UpdateParams
} from '../resources'

export class Log implements ILog {
	private _id: string
	private _type: 'span' | 'generation' | 'function' | 'tool' | 'retrieval' | 'event'
	private _name: string
	private _startTime: Date
	private _endTime: Date | undefined
	private _metadata: Record<string, unknown> | undefined

	private _parent: Span | undefined
	private _trace: Trace

	constructor(type: 'span' | 'generation' | 'function' | 'tool' | 'retrieval' | 'event', params: LogParams) {
		this._id = 'log-' + Math.random().toString(36).substring(2)
		this._type = type
		this._name = params.name
		this._startTime = params.startTime ? new Date(params.startTime) : new Date()
		this._endTime = params.endTime ? new Date(params.endTime) : undefined
		this._metadata = params.metadata
		this._trace = params.trace
		this._parent = params.parent

		params.trace.logs.push(this)
	}

	/* --------------------------------- Getters & Setters -------------------------------- */
	get id() {
		return this._id
	}

	get parent(): Span | undefined {
		return this._parent
	}

	set parent(parent: Span) {
		this._parent = parent
	}

	public get type() {
		return this._type
	}

	public get name() {
		return this._name
	}

	public get startTime() {
		return this._startTime
	}

	public get endTime() {
		return this._endTime
	}

	public get metadata() {
		return this._metadata
	}

	public get trace() {
		return this._trace
	}

	protected set trace(trace: Trace) {
		this._trace = trace
	}

	/* --------------------------------- Methods -------------------------------- */
	start() {
		this._startTime = new Date()

		return this
	}

	setMetadata(metadata: Metadata) {
		this._metadata = metadata

		return this
	}

	update(params: UpdateParams) {
		this._name = params.name ?? this._name
		this._metadata = params.metadata ?? this._metadata
		this._startTime = params.startTime ? new Date(params.startTime) : this._startTime
		this._endTime = params.endTime ? new Date(params.endTime) : this._endTime

		return this
	}

	end() {
		this._endTime = new Date()

		return this
	}
}