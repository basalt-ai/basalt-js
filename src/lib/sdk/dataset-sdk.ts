import { CreateDatasetItemEndpoint, GetDatasetEndpoint, ListDatasetsEndpoint } from '../endpoints'
import type {
	AsyncResult,
	CreateDatasetItemOptions,
	CreateDatasetItemResponse,
	DatasetListResponse,
	DatasetResponse,
	GetDatasetOptions,
	IApi,
	ICache,
	IDatasetSDK,
	Logger,
} from '../resources'
import { err, ok } from '../utils/utils'

export default class DatasetSDK implements IDatasetSDK {
	/**
   * @param api - The API interface for making requests.
   * @param queryCache - The cache used to read before making fetch requests
   *   reducing the latency and stress on the server.
   * @param fallbackCache - The cache used as a fallback mechanism.
   * @param logger - The logger interface for logging information.
   */
	constructor(
		private readonly api: IApi,
		private readonly queryCache: ICache,
		private readonly fallbackCache: ICache,
		private readonly logger: Logger,
	) {}

	/**
   * Gets the cache duration in milliseconds.
   *
   * @returns The cache duration in milliseconds.
   */
	private get cacheDuration() {
		return 5 * 60 * 1000
	}

	/**
   * Lists all available datasets.
   *
   * @returns A promise with an array of dataset list responses.
   */
	async list(): AsyncResult<DatasetListResponse[]> {
		return this._listDatasets()
	}

	/**
   * Gets a dataset by slug.
   *
   * @param slug - The slug of the dataset.
   * @param options - Optional parameters for the request.
   * @returns A promise with the dataset response.
   */
	async get(slug: string): AsyncResult<DatasetResponse> {
		return this._getDataset({ slug })
	}

	/**
   * Creates a new dataset item.
   *
   * @param slug - The slug of the dataset to add an item to.
   * @param options - Parameters for the request.
   * @returns A promise with the created dataset item response.
   */
	async addRow(slug: string, options: CreateDatasetItemOptions): AsyncResult<CreateDatasetItemResponse> {
		return this._createDatasetItem({ slug, ...options })
	}

	// --
	// Private methods
	// --

	/**
   * Lists all datasets from the Basalt API.
   *
   * @returns A promise with an array of dataset list responses.
   */
	private async _listDatasets(): AsyncResult<DatasetListResponse[]> {
		const result = await this.api.invoke(ListDatasetsEndpoint)

		if (result.error) {
			return err(result.error)
		}

		if (result.value.warning) {
			this.logger.warn(`Basalt Warning: "${result.value.warning}"`)
		}

		return ok(result.value.datasets)
	}

	/**
   * Gets a dataset from the Basalt API.
   *
   * @param options - Options to select the dataset.
   * @returns A promise with the dataset response.
   */
	private async _getDataset(options: GetDatasetOptions): AsyncResult<DatasetResponse> {
		// 1. Read from query cache first
		const cacheKey = options.slug
		const cached = this.queryCache.get<DatasetResponse>(cacheKey)

		if (cached) {
			return ok(cached)
		}

		// 2. If no cache, fetch from the API
		const result = await this.api.invoke(GetDatasetEndpoint, options)

		if (result.value) {
			this.queryCache.set(cacheKey, result.value.dataset, this.cacheDuration)
			this.fallbackCache.set(cacheKey, result.value.dataset, Infinity)

			if (result.value.warning) {
				this.logger.warn(`Basalt Warning: "${result.value.warning}"`)
			}

			return ok(result.value.dataset)
		}

		// 3. Api call failed, check if there is a fallback in the cache
		const fallback = this.fallbackCache.get<DatasetResponse>(cacheKey)

		if (fallback) {
			this.logger.warn(`Basalt Warning: Failed to fetch dataset from API, using last result for "${options.slug}"`)
			return ok(fallback)
		}

		return err(result.error)
	}

	/**
   * Creates a dataset item in the Basalt API.
   *
   * @param options - Options to create the dataset item.
   * @returns A promise with the created dataset item response.
   */
	private async _createDatasetItem(options: { slug: string } & CreateDatasetItemOptions): AsyncResult<CreateDatasetItemResponse> {
		const result = await this.api.invoke(CreateDatasetItemEndpoint, options)

		if (result.error) {
			return err(result.error)
		}

		if (result.value.warning) {
			this.logger.warn(`Basalt Warning: "${result.value.warning}"`)
		}

		return ok(result.value)
	}
}
