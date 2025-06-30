import type { DatasetRow } from '../resources/dataset/dataset.types'

/**
 * Represents a dataset in the Basalt system.
 */
export default class Dataset {
	/**
   * The slug of the dataset.
   */
	readonly slug: string

	/**
   * The name of the dataset.
   */
	readonly name: string

	/**
   * The columns of the dataset.
   */
	readonly columns: string[]

	/**
   * The rows of the dataset.
   */
	readonly rows: DatasetRow[]

	/**
   * Creates a new Dataset instance.
   *
   * @param slug - The slug of the dataset.
   * @param name - The name of the dataset.
   * @param columns - The columns of the dataset.
   * @param rows - The rows of the dataset.
   */
	constructor(slug: string, name: string, columns: string[], rows: DatasetRow[]) {
		this.slug = slug
		this.name = name
		this.columns = columns
		this.rows = rows
	}

	/**
   * Gets a row by its index.
   *
   * @param index - The index of the row to get.
   * @returns The row at the specified index, or undefined if the index is out of bounds.
   */
	getRow(index: number): DatasetRow | undefined {
		return this.rows[index]
	}
}

export { Dataset }
