import type { ReactElement } from 'react';
import { Document, type DocumentProps, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

export interface EntriesPdfFigure {
	label: string;
	value: string;
}

export interface EntriesPdfRow {
	key: string;
	cells: string[];
}

export interface EntriesPdfGroup {
	key: string;
	title: string;
	total: string;
	rows: EntriesPdfRow[];
}

export interface EntriesPdfContent {
	title: string;
	period: string;
	generatedOn: string;
	/** The filters the rows were kept by, printed under the header when there are some. */
	filters?: { title: string; lines: EntriesPdfFigure[] };
	summary: EntriesPdfFigure[];
	columns: string[];
	/** The width of each column on the landscape page, in the order of `columns`. */
	columnWidths: string[];
	groups: EntriesPdfGroup[];
	/** A closing row under the last group, for a report whose rows add up to one total. */
	total?: EntriesPdfFigure;
	footer: string;
	pageLabel: (page: number, total: number) => string;
}

/** react-pdf cannot read the CSS tokens: these are their light values. */
const INK = '#18181b';
const MUTED = '#66666e';
const HAIRLINE = '#e2e2e5';
const BAND = '#f4f4f5';

const FALLBACK_COLUMN_WIDTH = '5%';

const styles = StyleSheet.create({
	page: {
		paddingTop: 28,
		paddingBottom: 44,
		paddingHorizontal: 28,
		fontFamily: 'Helvetica',
		fontSize: 8,
		color: INK
	},
	header: { marginBottom: 12 },
	title: { fontSize: 15, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
	meta: { fontSize: 8, color: MUTED, marginBottom: 2 },
	filters: {
		marginBottom: 12,
		paddingVertical: 6,
		borderTopWidth: 0.5,
		borderBottomWidth: 0.5,
		borderColor: HAIRLINE
	},
	filtersTitle: { fontSize: 7, color: MUTED, marginBottom: 3 },
	filterLine: { marginBottom: 2 },
	summary: { flexDirection: 'row', marginBottom: 12, borderWidth: 0.5, borderColor: HAIRLINE, borderRadius: 6 },
	summaryCell: { flex: 1, paddingVertical: 7, paddingHorizontal: 9, borderLeftWidth: 0.5, borderColor: HAIRLINE },
	summaryFirstCell: { flex: 1, paddingVertical: 7, paddingHorizontal: 9 },
	summaryLabel: { fontSize: 7, color: MUTED, marginBottom: 3 },
	summaryValue: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
	tableHeader: { flexDirection: 'row', paddingVertical: 4, borderBottomWidth: 0.5, borderColor: HAIRLINE },
	headerCell: { fontSize: 7, color: MUTED, paddingRight: 4 },
	groupRow: { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 3, backgroundColor: BAND, marginTop: 5 },
	groupTitle: { flex: 1, fontFamily: 'Helvetica-Bold' },
	groupTotal: { fontFamily: 'Helvetica-Bold' },
	row: {
		flexDirection: 'row',
		paddingVertical: 3,
		paddingHorizontal: 3,
		borderBottomWidth: 0.5,
		borderColor: HAIRLINE
	},
	cell: { paddingRight: 4 },
	totalRow: { flexDirection: 'row', marginTop: 8, paddingVertical: 5, paddingHorizontal: 3 },
	footer: {
		position: 'absolute',
		bottom: 18,
		left: 28,
		right: 28,
		flexDirection: 'row',
		justifyContent: 'space-between',
		fontSize: 7,
		color: MUTED
	}
});

function summaryCellStyleOf(index: number) {
	if (index === 0) {
		return styles.summaryFirstCell;
	}
	return styles.summaryCell;
}

function SummaryBand({ summary }: Readonly<{ summary: EntriesPdfFigure[] }>) {
	return (
		<View style={styles.summary}>
			{summary.map((figure, index) => (
				<View key={figure.label} style={summaryCellStyleOf(index)}>
					<Text style={styles.summaryLabel}>{figure.label}</Text>
					<Text style={styles.summaryValue}>{figure.value}</Text>
				</View>
			))}
		</View>
	);
}

function printedFiltersOf(filters: EntriesPdfContent['filters']) {
	if (!filters || filters.lines.length === 0) {
		return null;
	}
	return filters;
}

function FiltersBlock({ title, lines }: Readonly<{ title: string; lines: EntriesPdfFigure[] }>) {
	return (
		<View style={styles.filters}>
			<Text style={styles.filtersTitle}>{title}</Text>
			{lines.map((line) => (
				<Text key={line.label} style={styles.filterLine}>
					{`${line.label}: ${line.value}`}
				</Text>
			))}
		</View>
	);
}

function widthOf(columnWidths: string[], index: number) {
	return columnWidths[index] ?? FALLBACK_COLUMN_WIDTH;
}

function TableHeader({ columns, columnWidths }: Readonly<{ columns: string[]; columnWidths: string[] }>) {
	return (
		<View style={styles.tableHeader} fixed>
			{columns.map((column, index) => (
				<Text key={column} style={[styles.headerCell, { width: widthOf(columnWidths, index) }]}>
					{column}
				</Text>
			))}
		</View>
	);
}

function cellsOf(row: EntriesPdfRow, columns: string[], columnWidths: string[]) {
	return row.cells.map((text, index) => {
		const column = columns[index] ?? `column-${index}`;
		return { column, text, width: widthOf(columnWidths, index) };
	});
}

function GroupBlock({
	group,
	columns,
	columnWidths
}: Readonly<{ group: EntriesPdfGroup; columns: string[]; columnWidths: string[] }>) {
	return (
		<View>
			<View style={styles.groupRow} wrap={false}>
				<Text style={styles.groupTitle}>{group.title}</Text>
				<Text style={styles.groupTotal}>{group.total}</Text>
			</View>
			{group.rows.map((row) => (
				<View key={row.key} style={styles.row} wrap={false}>
					{cellsOf(row, columns, columnWidths).map((cell) => (
						<Text key={cell.column} style={[styles.cell, { width: cell.width }]}>
							{cell.text}
						</Text>
					))}
				</View>
			))}
		</View>
	);
}

function TotalRow({ total }: Readonly<{ total: EntriesPdfFigure }>) {
	return (
		<View style={styles.totalRow} wrap={false}>
			<Text style={styles.groupTitle}>{total.label}</Text>
			<Text style={styles.groupTotal}>{total.value}</Text>
		</View>
	);
}

/**
 * A report of entries on a landscape page: header, the filters it was made with, a band of figures, then the
 * entries in titled groups, each with its total, and a closing total. Imported on the click with the renderer;
 * every string arrives translated and formatted.
 */
export function buildEntriesPdf(content: EntriesPdfContent): ReactElement<DocumentProps> {
	const { columns, columnWidths, total } = content;
	const filters = printedFiltersOf(content.filters);
	return (
		<Document title={content.title}>
			<Page size="A4" orientation="landscape" style={styles.page}>
				<View style={styles.header}>
					<Text style={styles.title}>{content.title}</Text>
					<Text style={styles.meta}>{content.period}</Text>
					<Text style={styles.meta}>{content.generatedOn}</Text>
				</View>
				{filters && <FiltersBlock title={filters.title} lines={filters.lines} />}
				<SummaryBand summary={content.summary} />
				<TableHeader columns={columns} columnWidths={columnWidths} />
				{content.groups.map((group) => (
					<GroupBlock key={group.key} group={group} columns={columns} columnWidths={columnWidths} />
				))}
				{total && <TotalRow total={total} />}
				<View style={styles.footer} fixed>
					<Text>{content.footer}</Text>
					<Text render={({ pageNumber, totalPages }) => content.pageLabel(pageNumber, totalPages)} />
				</View>
			</Page>
		</Document>
	);
}
