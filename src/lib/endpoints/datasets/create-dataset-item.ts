import type { DatasetRow, Result } from '../../resources'
import { err, ok } from '../../utils/utils'

interface Input {
	slug: string
	name?: string
	values: Record<string, string>
	idealOutput?: string
	metadata?: Record<string, unknown>
	isPlayground?: boolean
}

interface Output {
	warning?: string
	datasetRow: DatasetRow
}

export default class CreateDatasetItemEndpoint {
	static prepareRequest(dto: Input) {
		return {
			path: `/datasets/${dto.slug}/items`,
			method: 'post' as const,
			body: JSON.stringify({
				name: dto.name,
				values: dto.values,
				idealOutput: dto.idealOutput,
				metadata: dto.metadata,
				isPlayground: dto?.isPlayground,
			}),
		}
	}

	static decodeResponse(body: unknown): Result<Output> {
		if (
			body === null
			|| typeof body !== 'object'
		) {
			return err({ message: 'Create Dataset Item: Failed to decode response (invalid body format)' })
		}

		if (!('datasetRow' in body) || typeof body.datasetRow !== 'object' || body.datasetRow === null) {
			return err({ message: 'Create Dataset Item: Failed to decode response (missing datasetRow)' })
		}

		const datasetRow = body.datasetRow

		if (!('values' in datasetRow) || typeof datasetRow.values !== 'object' || datasetRow.values === null) {
			return err({ message: 'Create Dataset Item: Failed to decode response (missing datasetRow.values)' })
		}

		if ('name' in datasetRow && typeof datasetRow.name !== 'string' && datasetRow.name !== undefined) {
			return err({ message: 'Create Dataset Item: Failed to decode response (invalid datasetRow.name type)' })
		}

		if ('idealOutput' in datasetRow && typeof datasetRow.idealOutput !== 'string' && datasetRow.idealOutput !== undefined && datasetRow.idealOutput !== null) {
			return err({ message: 'Create Dataset Item: Failed to decode response (invalid datasetRow.idealOutput type)' })
		}

		if ('metadata' in datasetRow && typeof datasetRow.metadata !== 'object' && datasetRow.metadata !== null && datasetRow.metadata !== undefined) {
			return err({ message: 'Create Dataset Item: Failed to decode response (invalid datasetRow.metadata type)' })
		}

		const warning = 'warning' in body && typeof body.warning === 'string' ? body.warning : undefined

		return ok({ datasetRow: body.datasetRow as DatasetRow, warning })
	}
}
