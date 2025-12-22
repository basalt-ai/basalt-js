import type { Result } from '../../resources'
import { err, ok } from '../../utils/utils'

interface Input {
	filename: string
	content_type: string
	size_bytes?: number
}

interface Output {
	upload_url: string
	file_key: string
	expires_at: string
	max_size_bytes: number
}

export default class GenerateUploadUrlEndpoint {
	static prepareRequest(dto: Input) {
		return {
			path: '/files/generate-upload-url',
			method: 'post' as const,
			body: JSON.stringify({
				filename: dto.filename,
				content_type: dto.content_type,
				size_bytes: dto.size_bytes,
			}),
		}
	}

	static decodeResponse(body: unknown): Result<Output> {
		if (body === null || typeof body !== 'object') {
			return err({
				message: 'Generate Upload URL: Failed to decode response (invalid body format)',
			})
		}

		if (!('upload_url' in body) || typeof body.upload_url !== 'string') {
			return err({
				message: 'Generate Upload URL: Failed to decode response (missing upload_url)',
			})
		}

		if (!('file_key' in body) || typeof body.file_key !== 'string') {
			return err({
				message: 'Generate Upload URL: Failed to decode response (missing file_key)',
			})
		}

		if (!('expires_at' in body) || typeof body.expires_at !== 'string') {
			return err({
				message: 'Generate Upload URL: Failed to decode response (missing expires_at)',
			})
		}

		if (!('max_size_bytes' in body) || typeof body.max_size_bytes !== 'number') {
			return err({
				message: 'Generate Upload URL: Failed to decode response (missing max_size_bytes)',
			})
		}

		return ok({
			upload_url: body.upload_url,
			file_key: body.file_key,
			expires_at: body.expires_at,
			max_size_bytes: body.max_size_bytes,
		})
	}
}
