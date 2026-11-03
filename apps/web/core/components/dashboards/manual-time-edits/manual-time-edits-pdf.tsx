import type { ReactElement } from 'react';
import { Document, type DocumentProps, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

export interface EditsPdfFigure {
	label: string;
	value: string;
}

export interface EditsPdfRow {
	key: string;
	cells: string[];
}

export interface EditsPdfGroup {
	key: string;
	title: string;
	total: string;
	rows: EditsPdfRow[];
}

export interface EditsPdfContent {
	title: string;
	period: string;
	generatedOn: string;
	summary: EditsPdfFigure[];
	columns: string[];
	groups: EditsPdfGroup[];
	footer: string;
	pageLabel: (page: number, total: number) => string;
}

/** react-pdf cannot read the CSS tokens: these are their light values. */
const INK = '#18181b';
const MUTED = '#66666e';
const HAIRLINE = '#e2e2e5';
const BAND = '#f4f4f5';

/**
 * Date, member, project, task, start, end, duration, added, edited at, billable, status, reason: the widths of the
 * export columns on a landscape page, in that order.
 */
const COLUMN_WIDTHS = ['7%', '10%', '10%', '15%', '5%', '5%', '6%', '5%', '9%', '5%', '7%', '16%'];

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

function widthOf(index: number) {
	return COLUMN_WIDTHS[index] ?? '5%';
}

function summaryCellStyleOf(index: number) {
	if (index === 0) {
		return styles.summaryFirstCell;
	}
	return styles.summaryCell;
}

function SummaryBand({ summary }: Readonly<{ summary: EditsPdfFigure[] }>) {
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

function TableHeader({ columns }: Readonly<{ columns: string[] }>) {
	return (
		<View style={styles.tableHeader} fixed>
			{columns.map((column, index) => (
				<Text key={column} style={[styles.headerCell, { width: widthOf(index) }]}>
					{column}
				</Text>
			))}
		</View>
	);
}

function cellsOf(row: EditsPdfRow, columns: string[]) {
	return row.cells.map((text, index) => {
		const column = columns[index] ?? `column-${index}`;
		return { column, text, width: widthOf(index) };
	});
}

function GroupBlock({ group, columns }: Readonly<{ group: EditsPdfGroup; columns: string[] }>) {
	return (
		<View>
			<View style={styles.groupRow} wrap={false}>
				<Text style={styles.groupTitle}>{group.title}</Text>
				<Text style={styles.groupTotal}>{group.total}</Text>
			</View>
			{group.rows.map((row) => (
				<View key={row.key} style={styles.row} wrap={false}>
					{cellsOf(row, columns).map((cell) => (
						<Text key={cell.column} style={[styles.cell, { width: cell.width }]}>
							{cell.text}
						</Text>
					))}
				</View>
			))}
		</View>
	);
}

export function buildManualTimeEditsPdf(content: EditsPdfContent): ReactElement<DocumentProps> {
	return (
		<Document title={content.title}>
			<Page size="A4" orientation="landscape" style={styles.page}>
				<View style={styles.header}>
					<Text style={styles.title}>{content.title}</Text>
					<Text style={styles.meta}>{content.period}</Text>
					<Text style={styles.meta}>{content.generatedOn}</Text>
				</View>
				<SummaryBand summary={content.summary} />
				<TableHeader columns={content.columns} />
				{content.groups.map((group) => (
					<GroupBlock key={group.key} group={group} columns={content.columns} />
				))}
				<View style={styles.footer} fixed>
					<Text>{content.footer}</Text>
					<Text render={({ pageNumber, totalPages }) => content.pageLabel(pageNumber, totalPages)} />
				</View>
			</Page>
		</Document>
	);
}
