import type { DatasetResponse, Result } from '../../resources'
import { err, ok } from '../../utils/utils'

interface Input {
	slug: string
}

interface Output {
	warning?: string
	dataset: {
		slug: string
		name: string
		columns: string[]
		rows: DatasetRow[]
	}
}

interface DatasetRow {
	values: Record<string, string>
	idealOutput?: string
	metadata?: Record<string, unknown>
}

export default class GetDatasetEndpoint {
	static prepareRequest(dto: Input) {
		return {
			path: `/datasets/${dto.slug}`,
			method: 'get' as const,
		}
	}

	static decodeResponse(body: unknown): Result<Output> {
		if (
			body === null
			|| typeof body !== 'object'
		) {
			return err({ message: 'Get Dataset: Failed to decode response (invalid body format)' })
		}

		if (!('dataset' in body) || typeof body.dataset !== 'object' || body.dataset === null) {
			return err({ message: 'Get Dataset: Failed to decode response (missing dataset)' })
		}

		const dataset = body.dataset

		if (!('slug' in dataset) || typeof dataset.slug !== 'string') {
			return err({ message: 'Get Dataset: Failed to decode response (missing dataset.slug)' })
		}

		if (!('name' in dataset) || typeof dataset.name !== 'string') {
			return err({ message: 'Get Dataset: Failed to decode response (missing dataset.name)' })
		}

		if (!('columns' in dataset) || !Array.isArray(dataset.columns)) {
			return err({ message: 'Get Dataset: Failed to decode response (missing dataset.columns)' })
		}

		if (!('rows' in dataset) || !Array.isArray(dataset.rows)) {
			return err({ message: 'Get Dataset: Failed to decode response (missing dataset.rows)' })
		}

		const warning = 'warning' in body && typeof body.warning === 'string' ? body.warning : undefined

		return ok({ dataset: body.dataset as DatasetResponse, warning })
	}
}
