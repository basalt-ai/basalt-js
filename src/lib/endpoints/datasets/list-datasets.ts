import type { DatasetListResponse, Result } from '../../resources'
import { err, ok } from '../../utils/utils'

interface Output {
	warning?: string
	datasets: DatasetResponseItem[]
}

interface DatasetResponseItem {
	slug: string
	name: string
	columns: string[]
}

export default class ListDatasetsEndpoint {
	static prepareRequest() {
		return {
			path: '/datasets',
			method: 'get' as const,
		}
	}

	static decodeResponse(body: unknown): Result<Output> {
		if (
			body === null
			|| typeof body !== 'object'
		) {
			return err({ message: 'List Datasets: Failed to decode response (invalid body format)' })
		}

		if (!('datasets' in body) || !Array.isArray(body.datasets)) {
			return err({ message: 'List Datasets: Failed to decode response (missing datasets array)' })
		}

		const warning = 'warning' in body && typeof body.warning === 'string' ? body.warning : undefined

		return ok({ datasets: body.datasets as DatasetListResponse[], warning })
	}
}
