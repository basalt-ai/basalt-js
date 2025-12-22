/**
 * File source types supported across environments
 */
export type FileSource =
	| File              // Browser File API
	| Blob              // Browser Blob or Node.js Blob
	| Buffer            // Node.js Buffer
	| string            // Node.js file path

/**
 * Options for file attachment
 */
export interface FileAttachmentOptions {
	/**
	 * Override the auto-detected content type
	 */
	contentType?: string

	/**
	 * Optional filename (required for Buffer/Blob sources)
	 */
	filename?: string
}

/**
 * Represents a file to be uploaded as part of dataset row values
 *
 * @example
 * ```typescript
 * // Browser: Using File object
 * const fileInput = document.querySelector('input[type="file"]');
 * const file = fileInput.files[0];
 * const attachment = new FileAttachment(file);
 *
 * // Node.js: Using file path
 * const attachment = new FileAttachment('/path/to/image.png');
 *
 * // Node.js: Using Buffer
 * const buffer = fs.readFileSync('/path/to/file.pdf');
 * const attachment = new FileAttachment(buffer, {
 *   filename: 'document.pdf',
 *   contentType: 'application/pdf'
 * });
 * ```
 */
export class FileAttachment {
	public readonly source: FileSource
	public readonly options: FileAttachmentOptions

	constructor(source: FileSource, options: FileAttachmentOptions = {}) {
		this.source = source
		this.options = options

		// Validation
		this._validate()
	}

	/**
	 * Validates the file attachment configuration
	 */
	private _validate(): void {
		// For Buffer or Blob (but not File), filename is required
		if ((this.isBuffer() || (this.isBlob() && !this.isFile())) && !this.options.filename) {
			throw new Error(
				'FileAttachment: filename is required when using Buffer or Blob sources',
			)
		}
	}

	/**
	 * Type guard to check if source is a string path
	 */
	isPath(): this is { source: string } {
		return typeof this.source === 'string'
	}

	/**
	 * Type guard to check if source is a File object
	 */
	isFile(): this is { source: File } {
		return typeof File !== 'undefined' && this.source instanceof File
	}

	/**
	 * Type guard to check if source is a Blob
	 */
	isBlob(): this is { source: Blob } {
		return this.source instanceof Blob
	}

	/**
	 * Type guard to check if source is a Buffer
	 */
	isBuffer(): this is { source: Buffer } {
		return Buffer.isBuffer(this.source)
	}

	/**
	 * Gets the filename for this attachment
	 */
	getFilename(): string {
		if (this.options.filename) {
			return this.options.filename
		}

		if (this.isFile()) {
			return this.source.name
		}

		if (this.isPath()) {
			// Extract filename from path (handles both Unix and Windows paths)
			return this.source.split(/[\\/]/).pop() || 'file'
		}

		throw new Error('FileAttachment: Unable to determine filename')
	}

	/**
	 * Gets the size in bytes (if available)
	 */
	async getSize(): Promise<number | undefined> {
		if (this.isFile() || this.isBlob()) {
			return this.source.size
		}

		if (this.isBuffer()) {
			return this.source.length
		}

		if (this.isPath()) {
			// Will be determined by file upload utility using fs.stat
			return undefined
		}

		return undefined
	}
}
