import {
	BaseLogParams,
	BaseLog as IBaseLog,
	Log,
	LogType,
	Metadata,
	Trace,
	UpdateParams,
} from '../resources'
import { Evaluator } from '../resources/monitor/evaluator.types'

export class BaseLog implements IBaseLog {
	private _id: string
	private _type: LogType
	private _name: string
	private _startTime: Date
	private _endTime: Date | undefined
	private _metadata: Record<string, unknown> | undefined
	private _idealOutput: string | null

	private _parent: Log | undefined
	private _trace: Trace
	private _evaluators: Evaluator[] | undefined

	constructor(params: BaseLogParams & { type: LogType }) {
		this._id = 'log-' + Math.random().toString(36).substring(2)
		this._type = params.type
		this._name = params.name
		this._startTime = params.startTime ? new Date(params.startTime) : new Date()
		this._endTime = params.endTime ? new Date(params.endTime) : undefined
		this._metadata = params.metadata
		this._trace = params.trace
		this._parent = params.parent
		this._evaluators = params.evaluators
		this._idealOutput = params.idealOutput ?? null
		params.trace.logs.push(this)
	}

	/* --------------------------------- Getters & Setters -------------------------------- */
	get id() {
		return this._id
	}

	get parent(): Log | undefined {
		return this._parent
	}

	set parent(parent: Log) {
		this._parent = parent
	}

	public get type() {
		return this._type
	}

	public get name() {
		return this._name
	}

	public get idealOutput() {
		return this._idealOutput
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

	public set trace(trace: Trace) {
		this._trace = trace
	}

	public get evaluators() {
		return this._evaluators
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

	addEvaluator(evaluator: Evaluator) {
		this._evaluators = this._evaluators ?? []
		this._evaluators.push(evaluator)

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
