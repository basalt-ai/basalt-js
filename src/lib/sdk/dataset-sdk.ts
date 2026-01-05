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
import type { Span } from '@opentelemetry/api'
import { FileAttachment } from '../resources/dataset/file-attachment.types'
import { uploadFile } from '../utils/file-upload'
import { withBasaltSpan } from '../telemetry'
import { BASALT_ATTRIBUTES, CACHE_TYPES } from '../telemetry/attributes'
import { err, ok } from '../utils/utils'
import type { SpanHandle } from "../telemetry/basalt-span";

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
	async list(options?: { kind?: import('../telemetry/types').ObserveKind }): AsyncResult<DatasetListResponse[]> {
		return withBasaltSpan(
			'@basalt-ai/sdk',
			'basalt.dataset.list',
			{
				kind: options?.kind,
				[BASALT_ATTRIBUTES.METADATA]: JSON.stringify({
					'basalt.api.client': 'datasets',
					'basalt.api.operation': 'list',
					'basalt.internal.api': true,
				}),
			},
			async (span) => {
				// Capture input (empty for list)
				span.setInput({});

				const result = await this._listDatasets();

				if (result.value) {
					span.setAttribute(BASALT_ATTRIBUTES.REQUEST_SUCCESS, true);
					span.setAttribute(
						BASALT_ATTRIBUTES.DATASET_ROW_COUNT,
						result.value.length,
					);

					// Capture output
					span.setOutput(result.value);
				} else {
					// Capture error
					span.setOutput({ error: result.error.message });
				}

				return result
			},
		)
	}

	/**
   * Gets a dataset by slug.
   *
   * @param slug - The slug of the dataset.
   * @param options - Optional parameters for the request.
   * @returns A promise with the dataset response.
   */
	async get(slug: string, options?: { kind?: import('../telemetry/types').ObserveKind }): AsyncResult<DatasetResponse> {
		return withBasaltSpan(
			'@basalt-ai/sdk',
			'basalt.dataset.get',
			{
				kind: options?.kind,
				[BASALT_ATTRIBUTES.METADATA]: JSON.stringify({
					'basalt.api.client': 'datasets',
					'basalt.api.operation': 'get',
					'basalt.internal.api': true,
					'basalt.dataset.slug': slug,
				}),
			},
			async (span) => {
				// Capture input
				span.setInput({ slug });

				const result = await this._getDatasetWithCache({ slug }, span);

				if (result.value) {
					span.setAttribute(BASALT_ATTRIBUTES.REQUEST_SUCCESS, true);
					// Capture output
					span.setOutput(result.value);
				} else {
					// Capture error
					span.setOutput({ error: result.error.message });
				}

				return result
			},
		)
	}

	/**
   * Creates a new dataset item.
   *
   * @param slug - The slug of the dataset to add an item to.
   * @param options - Parameters for the request.
   * @returns A promise with the created dataset item response.
   */
	async addRow(slug: string, options: CreateDatasetItemOptions): AsyncResult<CreateDatasetItemResponse> {
		return withBasaltSpan(
			'@basalt-ai/sdk',
			'basalt.dataset.addRow',
			{
				kind: options.kind,
				[BASALT_ATTRIBUTES.METADATA]: JSON.stringify({
					'basalt.api.client': 'datasets',
					'basalt.api.operation': 'create',
					'basalt.internal.api': true,
					'basalt.dataset.slug': slug,
					'basalt.dataset.is_playground': options.isPlayground,
				}),
			},
			async (span) => {
				// Capture input (sanitize FileAttachment objects)
				const sanitizedValues: Record<string, string> = {};
				for (const [key, value] of Object.entries(options.values)) {
					if (value instanceof FileAttachment) {
						sanitizedValues[key] = `<FileAttachment: ${value.getFilename()}>`;
					} else {
						sanitizedValues[key] = value;
					}
				}

				span.setInput({
					slug,
					...(options.name && { name: options.name }),
					values: sanitizedValues,
					...(options.idealOutput && { idealOutput: options.idealOutput }),
					...(options.metadata && { metadata: options.metadata }),
					...(options.isPlayground !== undefined && {
						isPlayground: options.isPlayground,
					}),
				});

				const result = await this._createDatasetItem({ slug, ...options });

				if (result.value) {
					span.setAttribute(BASALT_ATTRIBUTES.REQUEST_SUCCESS, true);
					// Capture output
					span.setOutput(result.value);
				} else {
					// Capture error
					span.setOutput({ error: result.error.message });
				}

				return result
			},
		)
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
   * Gets a dataset from the Basalt API with cache tracking.
   *
   * @param options - Options to select the dataset.
   * @param span - OpenTelemetry span for adding cache attributes.
   * @returns A promise with the dataset response.
   */
	private async _getDatasetWithCache(
		options: GetDatasetOptions,
		span: SpanHandle,
	): AsyncResult<DatasetResponse> {
		// 1. Read from query cache first
		const cacheKey = options.slug
		const cached = this.queryCache.get<DatasetResponse>(cacheKey)

		if (cached) {
			span.setAttribute(BASALT_ATTRIBUTES.CACHE_HIT, true)
			span.setAttribute(BASALT_ATTRIBUTES.CACHE_TYPE, CACHE_TYPES.QUERY)
			return ok(cached)
		}

		// 2. If no cache, fetch from the API
		const result = await this.api.invoke(GetDatasetEndpoint, options)

		if (result.value) {
			span.setAttribute(BASALT_ATTRIBUTES.CACHE_HIT, false)

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
			span.setAttribute(BASALT_ATTRIBUTES.CACHE_HIT, true)
			span.setAttribute(BASALT_ATTRIBUTES.CACHE_TYPE, CACHE_TYPES.FALLBACK)

			this.logger.warn(`Basalt Warning: Failed to fetch dataset from API, using last result for "${options.slug}"`)
			return ok(fallback)
		}

		span.setAttribute(BASALT_ATTRIBUTES.CACHE_HIT, false)
		return err(result.error)
	}

	/**
   * Creates a dataset item in the Basalt API.
   *
   * @param options - Options to create the dataset item.
   * @returns A promise with the created dataset item response.
   */
	private async _createDatasetItem(options: { slug: string } & CreateDatasetItemOptions): AsyncResult<CreateDatasetItemResponse> {
		// Process file uploads if present
		let processedValues: Record<string, string>

		const hasFiles = Object.values(options.values).some(
			value => value instanceof FileAttachment,
		)

		if (hasFiles) {
			const uploadResult = await this._processFileUploads(options.values)
			if (uploadResult.error) {
				return err(uploadResult.error)
			}
			processedValues = uploadResult.value
		}
		else {
			// Type assertion: if no files, all values are already strings
			processedValues = options.values as Record<string, string>
		}

		// Call existing endpoint with processed values (all strings now)
		const result = await this.api.invoke(CreateDatasetItemEndpoint, {
			slug: options.slug,
			name: options.name,
			values: processedValues,
			idealOutput: options.idealOutput,
			metadata: options.metadata,
			isPlayground: options.isPlayground,
		})

		if (result.error) {
			return err(result.error)
		}

		if (result.value.warning) {
			this.logger.warn(`Basalt Warning: "${result.value.warning}"`)
		}

		return ok(result.value)
	}

	/**
   * Processes file uploads in values object.
   * Replaces FileAttachment instances with file_key strings.
   *
   * @param values - The values object potentially containing FileAttachment instances.
   * @returns A promise with processed values (all strings).
   */
	private async _processFileUploads(
		values: Record<string, string | FileAttachment>,
	): AsyncResult<Record<string, string>> {
		const processedValues: Record<string, string> = {}

		for (const [key, value] of Object.entries(values)) {
			if (value instanceof FileAttachment) {
				const uploadResult = await uploadFile(this.api, value)
				if (uploadResult.error) {
					return err({
						message: `Failed to upload file for field "${key}": ${uploadResult.error.message}`,
					})
				}
				processedValues[key] = uploadResult.value
			}
			else {
				processedValues[key] = value
			}
		}

		return ok(processedValues)
	}
}
