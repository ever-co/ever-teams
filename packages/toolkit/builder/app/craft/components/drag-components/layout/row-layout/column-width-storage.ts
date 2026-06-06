import { ColumnProps } from './column';

export class ColumnWidthStorage {
	private static cache: Record<string, ColumnProps[]> = {};
	private static initialized = false;

	static initialize() {
		if (this.initialized) return;
		this.initialized = true;
	}

	static storeColumnWidths(rowId: string, columns: ColumnProps[]): void {
		this.initialize();

		const columnsCopy = JSON.parse(JSON.stringify(columns));
		this.cache[rowId] = columnsCopy;
	}

	static getColumnWidths(rowId: string): ColumnProps[] | null {
		const stored = this.cache[rowId];
		if (stored) {
			return JSON.parse(JSON.stringify(stored));
		}
		return null;
	}

	static checkAndRestore(rowId: string, columns: ColumnProps[]): ColumnProps[] | null {
		const isDefault = columns.length === 3 && columns.every((col: ColumnProps) => col.size === '4');

		if (isDefault && this.cache[rowId]) {
			return this.getColumnWidths(rowId);
		}

		return null;
	}
}

if (typeof window !== 'undefined') {
	ColumnWidthStorage.initialize();
}
