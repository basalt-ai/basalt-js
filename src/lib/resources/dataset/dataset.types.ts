/**
 * Interface for the Dataset SDK.
 */

import { AsyncResult } from '../contract'

/**
 * @preserve
 * Interface for interacting with Basalt datasets.
 *
 * @example
 * ```typescript
 * const datasetSDK: IDatasetSDK = ...; // Assume this is initialized
 *
 * // Example 1: Listing all datasets
 * const datasets = await datasetSDK.list();
 * if (datasets.error) {
 *   console.log('Error fetching datasets:', datasets.error.message);
 * } else {
 *   console.log('Datasets fetched successfully:', datasets.value);
 * }
 *
 * // Example 2: Getting a specific dataset by slug
 * const dataset = await datasetSDK.get('example-dataset');
 * if (dataset.error) {
 *   console.log('Error fetching dataset:', dataset.error.message);
 * } else {
 *   console.log('Dataset fetched successfully:', dataset.value);
 * }
 *
 * // Example 3: Creating a new dataset item
 * const newItem = await datasetSDK.createItem('example-dataset', {
 *   name: 'Example Item',
 *   values: { input: 'Test input', output: 'Test output' },
 *   idealOutput: 'Expected output',
 *   metadata: { source: 'manual' },
 *   isPlayground: false
 * });
 * ```
 */
export interface IDatasetSDK {
	/**
   * List datasets from the Basalt API
   *
   * @param options - Optional parameters for the request.
   *    - workspaceSlug: The slug of the workspace to filter datasets by.
   *
   * @example
   * ```typescript
   * const result = await basalt.dataset.list({ workspaceSlug: 'my-workspace' });
   *
   * if (result.error) {
   *   console.log(result.error.message);
   *   return;
   * }
   *
   * // Find the datasets in result.value
   * result.value.forEach(dataset => console.log(dataset.name));
   * ```
   *
   * @returns Promise of a Result object containing datasets or any occurred error.
   */
	list(options?: ListDatasetsOptions): AsyncResult<DatasetListResponse[]>

	/**
   * Get a dataset from the Basalt API
   *
   * @param slug - The slug of the dataset.
   *
   * @example
   * ```typescript
   * const result = await basalt.dataset.get('my-dataset');
   *
   * if (result.error) {
   *   console.log(result.error.message);
   *   return;
   * }
   *
   * // Find the dataset in result.value
   * console.log(result.value.name);
   * console.log(result.value.columns);
   * ```
   *
   * @returns Promise of a Result object containing dataset or any occurred error.
   */
	get(slug: string): AsyncResult<DatasetResponse>

	/**
   * Create a dataset item in the Basalt API
   *
   * @param slug - The slug of the dataset to add the item to.
   * @param options - Parameters for creating the dataset item.
   *
   * @example
   * ```typescript
   * const result = await basalt.dataset.createItem('my-dataset', {
   *   name: 'Example Item',
   *   values: { input: 'Test input', output: 'Test output' },
   *   idealOutput: 'Expected output',
   *   metadata: { source: 'manual' },
   *   isPlayground: false
   * });
   *
   * if (result.error) {
   *   console.log(result.error.message);
   *   return;
   * }
   *
   * // Find the created item in result.value.datasetRow
   * console.log(result.value.datasetRow);
   * ```
   *
   * @returns Promise of a Result object containing created dataset item or any occurred error.
   */
	createItem(slug: string, options: CreateDatasetItemOptions): AsyncResult<CreateDatasetItemResponse>
}

/**
 * Options for the `list` method of the `IDatasetSDK` interface.
 */
export interface ListDatasetsOptions {
	workspaceSlug?: string
}

/**
 * Options for the `get` method of the `IDatasetSDK` interface.
 */
export interface GetDatasetOptions {
	slug: string
}

/**
 * Options for the `createItem` method of the `IDatasetSDK` interface.
 */
export interface CreateDatasetItemOptions {
	name?: string
	values: Record<string, string>
	idealOutput?: string
	metadata?: Record<string, unknown>
	isPlayground?: boolean
}

/**
 * Response type for the `list` method of the `IDatasetSDK` interface.
 */
export interface DatasetListResponse {
	slug: string
	name: string
	columns: string[]
}

/**
 * Dataset row structure returned in dataset responses
 */
export interface DatasetRow {
	values: Record<string, string>
	idealOutput?: string
	metadata?: Record<string, unknown>
}

/**
 * Response type for the `get` method of the `IDatasetSDK` interface.
 */
export interface DatasetResponse {
	slug: string
	name: string
	columns: string[]
	rows: DatasetRow[]
}

/**
 * Response type for the `createItem` method of the `IDatasetSDK` interface.
 */
export interface CreateDatasetItemResponse {
	warning?: string
	datasetRow: {
		name?: string
		values: Record<string, string>
		idealOutput?: string
		metadata?: Record<string, unknown>
	}
}
