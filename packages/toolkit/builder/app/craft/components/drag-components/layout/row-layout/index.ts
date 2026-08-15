import Row from './row';
import RowSettings from './row-settings';
import Column from './column';
import ColumnSettings from './column-settings';
import type { RowProps } from './row';
import type { ColumnProps, ColumnSize } from './column';
import { RowDefaultProps, ROW_PRESETS } from './row';
import { ColumnDefaultProps, COLUMN_PRESETS } from './column';

type CraftComponent<T> = React.FC<T> & {
	craft: {
		displayName: string;
		props: Record<string, any>;
		rules?: {
			canDrag: () => boolean;
		};
		related?: {
			settings: React.ComponentType;
		};
	};
};
// @ts-ignore
const RowComponent: CraftComponent<RowProps & { children?: React.ReactNode }> = Object.assign(Row, {
	craft: {
		props: RowDefaultProps,
		displayName: 'Row',
		related: {
			settings: RowSettings
		},
		rules: {
			canDrag: () => true
		}
	}
});

// @ts-ignore
const ColumnComponent: CraftComponent<{
	size: string;
	children?: React.ReactNode;
	custom?: {
		columnId: string;
		columnIndex: number;
	};
}> = Object.assign(Column, {
	craft: {
		displayName: 'Column',
		props: {
			size: ColumnDefaultProps.size
		},
		related: {
			settings: ColumnSettings
		}
	}
});

export const RowLayout = RowComponent;
export const ColumnLayout = ColumnComponent;
export type { RowProps, ColumnProps, ColumnSize };
export { RowDefaultProps, ColumnDefaultProps, ROW_PRESETS, COLUMN_PRESETS };
