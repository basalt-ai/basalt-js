import { FileAttachment } from '../lib/resources/dataset/file-attachment.types'

describe('FileAttachment', () => {
	describe('constructor validation', () => {
		test('accepts Blob source with filename option', () => {
			const blob = new Blob(['test content'], { type: 'text/plain' })
			const attachment = new FileAttachment(blob, { filename: 'test.txt' })

			expect(attachment.source).toBe(blob)
			expect(attachment.options.filename).toBe('test.txt')
		})

		test('accepts Buffer source with filename option', () => {
			const buffer = Buffer.from('test content')
			const attachment = new FileAttachment(buffer, { filename: 'test.bin' })

			expect(attachment.source).toBe(buffer)
			expect(attachment.options.filename).toBe('test.bin')
		})

		test('accepts string path without filename option', () => {
			const path = '/tmp/test-file.txt'
			const attachment = new FileAttachment(path)

			expect(attachment.source).toBe(path)
		})

		test('throws error for Blob without filename', () => {
			const blob = new Blob(['test'])

			expect(() => {
				new FileAttachment(blob)
			}).toThrow('filename is required')
		})

		test('throws error for Buffer without filename', () => {
			const buffer = Buffer.from('test')

			expect(() => {
				new FileAttachment(buffer)
			}).toThrow('filename is required')
		})
	})

	describe('type guards', () => {
		test('isPath() returns true for string source', () => {
			const attachment = new FileAttachment('/tmp/file.txt')

			expect(attachment.isPath()).toBe(true)
		})

		test('isPath() returns false for non-string source', () => {
			const blob = new Blob(['test'])
			const attachment = new FileAttachment(blob, { filename: 'test.txt' })

			expect(attachment.isPath()).toBe(false)
		})

		test('isBlob() returns true for Blob source', () => {
			const blob = new Blob(['test'], { type: 'text/plain' })
			const attachment = new FileAttachment(blob, { filename: 'test.txt' })

			expect(attachment.isBlob()).toBe(true)
		})

		test('isBlob() returns false for non-Blob source', () => {
			const buffer = Buffer.from('test')
			const attachment = new FileAttachment(buffer, { filename: 'test.txt' })

			expect(attachment.isBlob()).toBe(false)
		})

		test('isBuffer() returns true for Buffer source', () => {
			const buffer = Buffer.from('test content')
			const attachment = new FileAttachment(buffer, { filename: 'test.bin' })

			expect(attachment.isBuffer()).toBe(true)
		})

		test('isBuffer() returns false for non-Buffer source', () => {
			const blob = new Blob(['test'])
			const attachment = new FileAttachment(blob, { filename: 'test.txt' })

			expect(attachment.isBuffer()).toBe(false)
		})

		test('isFile() returns false for Blob in Node.js environment', () => {
			const blob = new Blob(['test'])
			const attachment = new FileAttachment(blob, { filename: 'test.txt' })

			// In Node.js, File constructor is not available
			// isFile() should return false for Blob
			expect(attachment.isFile()).toBe(false)
		})
	})

	describe('getFilename()', () => {
		test('returns explicit filename from options when provided', () => {
			const blob = new Blob(['test'])
			const attachment = new FileAttachment(blob, { filename: 'override.txt' })

			expect(attachment.getFilename()).toBe('override.txt')
		})

		test('extracts filename from Unix path', () => {
			const attachment = new FileAttachment('/home/user/documents/report.pdf')

			expect(attachment.getFilename()).toBe('report.pdf')
		})

		test('extracts filename from Windows path', () => {
			const attachment = new FileAttachment('C:\\Users\\user\\Documents\\file.docx')

			expect(attachment.getFilename()).toBe('file.docx')
		})

		test('handles path with no directory separators', () => {
			const attachment = new FileAttachment('filename.txt')

			expect(attachment.getFilename()).toBe('filename.txt')
		})

		test('handles nested Unix paths', () => {
			const attachment = new FileAttachment('/var/www/html/uploads/images/photo.jpg')

			expect(attachment.getFilename()).toBe('photo.jpg')
		})

		test('throws error for Blob without filename option', () => {
			const blob = new Blob(['test'])

			// Constructor already throws, but if we somehow bypass that...
			expect(() => {
				new FileAttachment(blob)
			}).toThrow()
		})

		test('options filename takes precedence over path extraction', () => {
			const attachment = new FileAttachment('/tmp/original.txt', { filename: 'custom.txt' })

			expect(attachment.getFilename()).toBe('custom.txt')
		})
	})

	describe('getSize()', () => {
		test('returns Blob size', async () => {
			const content = 'test content here'
			const blob = new Blob([content], { type: 'text/plain' })
			const attachment = new FileAttachment(blob, { filename: 'test.txt' })

			const size = await attachment.getSize()

			expect(size).toBe(content.length)
		})

		test('returns Buffer length', async () => {
			const content = 'buffer content'
			const buffer = Buffer.from(content)
			const attachment = new FileAttachment(buffer, { filename: 'test.bin' })

			const size = await attachment.getSize()

			expect(size).toBe(buffer.length)
		})

		test('returns undefined for path source', async () => {
			const attachment = new FileAttachment('/tmp/file.txt')

			const size = await attachment.getSize()

			expect(size).toBeUndefined()
		})

		test('returns correct size for empty Blob', async () => {
			const blob = new Blob([], { type: 'text/plain' })
			const attachment = new FileAttachment(blob, { filename: 'empty.txt' })

			const size = await attachment.getSize()

			expect(size).toBe(0)
		})

		test('returns correct size for empty Buffer', async () => {
			const buffer = Buffer.alloc(0)
			const attachment = new FileAttachment(buffer, { filename: 'empty.bin' })

			const size = await attachment.getSize()

			expect(size).toBe(0)
		})
	})

	describe('content type options', () => {
		test('stores contentType option when provided', () => {
			const blob = new Blob(['test'])
			const attachment = new FileAttachment(blob, {
				filename: 'test.txt',
				contentType: 'application/custom',
			})

			expect(attachment.options.contentType).toBe('application/custom')
		})

		test('accepts contentType override for Buffer source', () => {
			const buffer = Buffer.from('binary data')
			const attachment = new FileAttachment(buffer, {
				filename: 'data.bin',
				contentType: 'application/octet-stream',
			})

			expect(attachment.options.contentType).toBe('application/octet-stream')
		})

		test('accepts contentType override for path source', () => {
			const attachment = new FileAttachment('/tmp/file.dat', {
				contentType: 'application/x-custom',
			})

			expect(attachment.options.contentType).toBe('application/x-custom')
		})
	})
})
