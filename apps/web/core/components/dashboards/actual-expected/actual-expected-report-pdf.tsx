import type { ReactElement } from 'react';
import { Document, type DocumentProps, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

export interface PlanPdfFigure {
	label: string;
	value: string;
}

export interface PlanPdfLine {
	key: string;
	first: string;
	note: string;
	expected: string;
	actual: string;
	difference: string;
	reached: string;
}

export interface PlanPdfGroup {
	key: string;
	line: PlanPdfLine;
	rows: PlanPdfLine[];
}

export interface PlanPdfContent {
	title: string;
	period: string;
	generatedOn: string;
	summary: PlanPdfFigure[];
	columns: { first: string; expected: string; actual: string; difference: string; reached: string };
	groups: PlanPdfGroup[];
	total: PlanPdfLine;
	pageLabel: (page: number, total: number) => string;
}

/** react-pdf cannot read the CSS tokens: these are their light values. */
const INK = '#18181b';
const MUTED = '#66666e';
const HAIRLINE = '#e2e2e5';
const BAND = '#f4f4f5';

const styles = StyleSheet.create({
	page: {
		paddingTop: 32,
		paddingBottom: 48,
		paddingHorizontal: 32,
		fontFamily: 'Helvetica',
		fontSize: 9,
		color: INK
	},
	header: { marginBottom: 14 },
	title: { fontSize: 16, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
	meta: { fontSize: 9, color: MUTED, marginBottom: 2 },
	summary: { flexDirection: 'row', marginBottom: 14, borderWidth: 0.5, borderColor: HAIRLINE, borderRadius: 6 },
	summaryCell: { flex: 1, paddingVertical: 8, paddingHorizontal: 10, borderLeftWidth: 0.5, borderColor: HAIRLINE },
	summaryFirstCell: { flex: 1, paddingVertical: 8, paddingHorizontal: 10 },
	summaryLabel: { fontSize: 8, color: MUTED, marginBottom: 3 },
	summaryValue: { fontSize: 12, fontFamily: 'Helvetica-Bold' },
	tableHeader: { flexDirection: 'row', paddingVertical: 5, borderBottomWidth: 0.5, borderColor: HAIRLINE },
	headerCell: { fontSize: 8, color: MUTED },
	groupRow: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 4, backgroundColor: BAND, marginTop: 6 },
	totalRow: {
		flexDirection: 'row',
		paddingVertical: 6,
		paddingHorizontal: 4,
		marginTop: 8,
		borderTopWidth: 0.5,
		borderColor: HAIRLINE
	},
	bold: { fontFamily: 'Helvetica-Bold' },
	row: {
		flexDirection: 'row',
		paddingVertical: 4,
		paddingHorizontal: 4,
		borderBottomWidth: 0.5,
		borderColor: HAIRLINE
	},
	first: { flex: 1, paddingRight: 6 },
	note: { color: MUTED, fontSize: 8 },
	figure: { width: '13%', textAlign: 'right' },
	footer: {
		position: 'absolute',
		bottom: 20,
		left: 32,
		right: 32,
		flexDirection: 'row',
		justifyContent: 'flex-end',
		fontSize: 8,
		color: MUTED
	}
});

function summaryCellStyleOf(index: number) {
	if (index === 0) {
		return styles.summaryFirstCell;
	}
	return styles.summaryCell;
}

function SummaryBand({ summary }: Readonly<{ summary: PlanPdfFigure[] }>) {
	return (
		<View style={styles.summary}>
			{summary.map((figure, index) => {
				const cellStyle = summaryCellStyleOf(index);
				return (
					<View key={figure.label} style={cellStyle}>
						<Text style={styles.summaryLabel}>{figure.label}</Text>
						<Text style={styles.summaryValue}>{figure.value}</Text>
					</View>
				);
			})}
		</View>
	);
}

function TableHeader({ columns }: Readonly<{ columns: PlanPdfContent['columns'] }>) {
	return (
		<View style={styles.tableHeader} fixed>
			<Text style={[styles.headerCell, styles.first]}>{columns.first}</Text>
			<Text style={[styles.headerCell, styles.figure]}>{columns.expected}</Text>
			<Text style={[styles.headerCell, styles.figure]}>{columns.actual}</Text>
			<Text style={[styles.headerCell, styles.figure]}>{columns.difference}</Text>
			<Text style={[styles.headerCell, styles.figure]}>{columns.reached}</Text>
		</View>
	);
}

function LineCells({ line, isBold }: Readonly<{ line: PlanPdfLine; isBold: boolean }>) {
	const hasNote = line.note.length > 0;
	const textStyle = boldStyleOf(isBold);
	return (
		<>
			<View style={styles.first}>
				<Text style={textStyle}>{line.first}</Text>
				{hasNote && <Text style={styles.note}>{line.note}</Text>}
			</View>
			<Text style={[styles.figure, textStyle]}>{line.expected}</Text>
			<Text style={[styles.figure, textStyle]}>{line.actual}</Text>
			<Text style={[styles.figure, textStyle]}>{line.difference}</Text>
			<Text style={[styles.figure, textStyle]}>{line.reached}</Text>
		</>
	);
}

function boldStyleOf(isBold: boolean) {
	if (isBold) {
		return styles.bold;
	}
	return {};
}

function GroupBlock({ group }: Readonly<{ group: PlanPdfGroup }>) {
	return (
		<View>
			<View style={styles.groupRow} wrap={false}>
				<LineCells line={group.line} isBold />
			</View>
			{group.rows.map((row) => (
				<View key={row.key} style={styles.row} wrap={false}>
					<LineCells line={row} isBold={false} />
				</View>
			))}
		</View>
	);
}

/** Imported on the click with the renderer; every string arrives translated and formatted. */
export function buildActualExpectedPdf(content: PlanPdfContent): ReactElement<DocumentProps> {
	return (
		<Document title={content.title}>
			<Page size="A4" style={styles.page}>
				<View style={styles.header}>
					<Text style={styles.title}>{content.title}</Text>
					<Text style={styles.meta}>{content.period}</Text>
					<Text style={styles.meta}>{content.generatedOn}</Text>
				</View>
				<SummaryBand summary={content.summary} />
				<TableHeader columns={content.columns} />
				{content.groups.map((group) => (
					<GroupBlock key={group.key} group={group} />
				))}
				<View style={styles.totalRow} wrap={false}>
					<LineCells line={content.total} isBold />
				</View>
				<View style={styles.footer} fixed>
					<Text render={({ pageNumber, totalPages }) => content.pageLabel(pageNumber, totalPages)} />
				</View>
			</Page>
		</Document>
	);
}
