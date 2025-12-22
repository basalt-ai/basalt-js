export class NetworkBaseError extends Error {
	public readonly url?: URL

	constructor(opts: { url?: URL, message?: string }) {
		const m = opts.message ?? (
			opts.url
				? `Network Error on ${opts.url?.toString()}`
				: 'Network Error'
		)

		super(m)
		this.url = opts.url
	}
}

export class Forbidden extends NetworkBaseError {
	constructor(opts: { url?: URL, message?: string }) {
		super({
			message: `Forbidden: ${opts.message ?? ''}`,
		})
	}
}

export class Unauthorized extends NetworkBaseError {
	constructor(opts: { url?: URL, message?: string }) {
		super({
			message: `Unauthorized: "${opts.message ?? ''}".

This error can be caused by:
  - An invalid API key
  - A missing API key

Hint: Insert your API Key when initializing the Basalt sdk:
const basalt = new BasaltSDK({ apiKey: 'YOUR_API_KEY' })
                               ^^^^^^^^^^^^^^^^^^^^^^

Hint: Create a new API Key on https://app.getbasalt.ai/.`,
		})
	}
}

export class BadInput extends NetworkBaseError {
	public readonly details: Record<string, string[]>

	constructor(opts: {
		url?: URL
		message?: string
		details?: Record<string, string[]>
	}) {
		super({
			message: 'Bad Input',
			...opts,
		})

		this.details = opts.details ?? {}
	}

	field(name: string) {
		return this.details[name]?.[0]
	}
}

export class NotFound extends NetworkBaseError {
	constructor(opts: { url?: URL, message?: string }) {
		super({
			message: `Not found: "${opts.message ?? ''}"`,
			...opts,
		})
	}
}

export class BadRequest extends NetworkBaseError {
	constructor(opts: { url?: URL, message?: string }) {
		super({
			message: 'Bad Request',
			...opts,
		})
	}
}

/**
 * Error specific to file upload operations
 */
export class FileUploadError extends Error {
	public readonly filename?: string

	constructor(opts: { message: string, filename?: string }) {
		super(opts.message)
		this.filename = opts.filename
		this.name = 'FileUploadError'
	}
}

/**
 * Error for file validation failures
 */
export class FileValidationError extends Error {
	public readonly filename?: string
	public readonly validationErrors: string[]

	constructor(opts: {
		message: string
		filename?: string
		validationErrors?: string[]
	}) {
		super(opts.message)
		this.filename = opts.filename
		this.validationErrors = opts.validationErrors || []
		this.name = 'FileValidationError'
	}
}
