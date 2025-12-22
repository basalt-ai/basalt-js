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
				fileName: dto.filename,
				contentType: dto.content_type,
				sizeBytes: dto.size_bytes,
			}),
		}
	}

	static decodeResponse(body: unknown): Result<Output> {
		if (body === null || typeof body !== 'object') {
			return err({
				message: 'Generate Upload URL: Failed to decode response (invalid body format)',
			})
		}

		if (!('uploadUrl' in body) || typeof body.uploadUrl !== 'string') {
			return err({
				message: 'Generate Upload URL: Failed to decode response (missing uploadUrl)',
			})
		}

		if (!('fileKey' in body) || typeof body.fileKey !== 'string') {
			return err({
				message: 'Generate Upload URL: Failed to decode response (missing fileKey)',
			})
		}

		if (!('expiresAt' in body) || typeof body.expiresAt !== 'string') {
			return err({
				message: 'Generate Upload URL: Failed to decode response (missing expiresAt)',
			})
		}

		if (!('maxSizeBytes' in body) || typeof body.maxSizeBytes !== 'number') {
			return err({
				message: 'Generate Upload URL: Failed to decode response (missing maxSizeBytes)',
			})
		}

		return ok({
			upload_url: body.uploadUrl,
			file_key: body.fileKey,
			expires_at: body.expiresAt,
			max_size_bytes: body.maxSizeBytes,
		})
	}
}
