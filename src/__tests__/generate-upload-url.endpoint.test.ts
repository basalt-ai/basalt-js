import fixtures from '../__fixtures__/generate-upload-url.json'
import GenerateUploadUrlEndpoint from '../lib/endpoints/files/generate-upload-url'

describe('GenerateUploadUrlEndpoint', () => {
	describe('prepareRequest', () => {
		test('path is /files/generate-upload-url and method is post', () => {
			const result = GenerateUploadUrlEndpoint.prepareRequest({
				filename: 'test.png',
				content_type: 'image/png',
			})

			expect(result.path).toBe('/files/generate-upload-url')
			expect(result.method).toBe('post')
		})

		test('request body includes filename and content_type', () => {
			const params = {
				filename: 'document.pdf',
				content_type: 'application/pdf',
			}

			const result = GenerateUploadUrlEndpoint.prepareRequest(params)

			expect(result.body).toMatch(JSON.stringify({
				filename: params.filename,
				content_type: params.content_type,
			}))
		})

		test('request body includes size_bytes when provided', () => {
			const params = {
				filename: 'image.jpg',
				content_type: 'image/jpeg',
				size_bytes: 1024000,
			}

			const result = GenerateUploadUrlEndpoint.prepareRequest(params)

			expect(result.body).toMatch(JSON.stringify({
				filename: params.filename,
				content_type: params.content_type,
				size_bytes: params.size_bytes,
			}))
		})

		test('request body excludes size_bytes when undefined', () => {
			const params = {
				filename: 'file.txt',
				content_type: 'text/plain',
			}

			const result = GenerateUploadUrlEndpoint.prepareRequest(params)
			const body = JSON.parse(result.body)

			expect(body).toHaveProperty('filename')
			expect(body).toHaveProperty('content_type')
			expect(body.size_bytes).toBeUndefined()
		})
	})

	describe('decodeResponse', () => {
		test('positively decodes valid response with all required fields', () => {
			const result = GenerateUploadUrlEndpoint.decodeResponse(fixtures.validResponse.body)

			expect(result.error).toBeNull()
			expect(result.value).toMatchObject({
				upload_url: fixtures.validResponse.body.upload_url,
				file_key: fixtures.validResponse.body.file_key,
				expires_at: fixtures.validResponse.body.expires_at,
				max_size_bytes: fixtures.validResponse.body.max_size_bytes,
			})
		})

		test('rejects response missing upload_url', () => {
			const body = {
				file_key: 'files/test',
				expires_at: '2025-12-23T10:00:00Z',
				max_size_bytes: 10485760,
			}

			const result = GenerateUploadUrlEndpoint.decodeResponse(body)

			expect(result.error).not.toBeNull()
			expect(result.error?.message).toContain('upload_url')
		})

		test('rejects response missing file_key', () => {
			const body = {
				upload_url: 'https://s3.amazonaws.com/test',
				expires_at: '2025-12-23T10:00:00Z',
				max_size_bytes: 10485760,
			}

			const result = GenerateUploadUrlEndpoint.decodeResponse(body)

			expect(result.error).not.toBeNull()
			expect(result.error?.message).toContain('file_key')
		})

		test('rejects response missing expires_at', () => {
			const body = {
				upload_url: 'https://s3.amazonaws.com/test',
				file_key: 'files/test',
				max_size_bytes: 10485760,
			}

			const result = GenerateUploadUrlEndpoint.decodeResponse(body)

			expect(result.error).not.toBeNull()
			expect(result.error?.message).toContain('expires_at')
		})

		test('rejects response missing max_size_bytes', () => {
			const body = {
				upload_url: 'https://s3.amazonaws.com/test',
				file_key: 'files/test',
				expires_at: '2025-12-23T10:00:00Z',
			}

			const result = GenerateUploadUrlEndpoint.decodeResponse(body)

			expect(result.error).not.toBeNull()
			expect(result.error?.message).toContain('max_size_bytes')
		})

		test('rejects response with wrong type for upload_url', () => {
			const body = {
				upload_url: 123,
				file_key: 'files/test',
				expires_at: '2025-12-23T10:00:00Z',
				max_size_bytes: 10485760,
			}

			const result = GenerateUploadUrlEndpoint.decodeResponse(body)

			expect(result.error).not.toBeNull()
			expect(result.error?.message).toContain('upload_url')
		})

		test('rejects response with wrong type for file_key', () => {
			const body = {
				upload_url: 'https://s3.amazonaws.com/test',
				file_key: 123,
				expires_at: '2025-12-23T10:00:00Z',
				max_size_bytes: 10485760,
			}

			const result = GenerateUploadUrlEndpoint.decodeResponse(body)

			expect(result.error).not.toBeNull()
			expect(result.error?.message).toContain('file_key')
		})

		test('rejects response with wrong type for expires_at', () => {
			const body = {
				upload_url: 'https://s3.amazonaws.com/test',
				file_key: 'files/test',
				expires_at: 12345,
				max_size_bytes: 10485760,
			}

			const result = GenerateUploadUrlEndpoint.decodeResponse(body)

			expect(result.error).not.toBeNull()
			expect(result.error?.message).toContain('expires_at')
		})

		test('rejects response with wrong type for max_size_bytes', () => {
			const body = {
				upload_url: 'https://s3.amazonaws.com/test',
				file_key: 'files/test',
				expires_at: '2025-12-23T10:00:00Z',
				max_size_bytes: '10485760',
			}

			const result = GenerateUploadUrlEndpoint.decodeResponse(body)

			expect(result.error).not.toBeNull()
			expect(result.error?.message).toContain('max_size_bytes')
		})

		test.each([
			'some text - while the content should be json',
			null,
			undefined,
			[],
			100,
			true,
			fixtures.falsePositive.body,
		])('rejects invalid responses', (body) => {
			const result = GenerateUploadUrlEndpoint.decodeResponse(body)

			expect(result.error).not.toBeNull()
		})
	})
})
