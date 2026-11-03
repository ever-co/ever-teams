import type { ReactElement } from 'react';
import { Document, type DocumentProps, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

export interface PdfFigure {
	label: string;
	value: string;
}

export interface PdfRow {
	key: string;
	first: string;
	second: string;
	task: string;
	tracked: string;
	earnings: string;
	activity: string;
}

export interface PdfGroup {
	key: string;
	title: string;
	tracked: string;
	earnings: string;
	activity: string;
	rows: PdfRow[];
}

export interface TimeActivityPdfContent {
	title: string;
	period: string;
	generatedOn: string;
	filtersTitle: string;
	filters: PdfFigure[];
	summary: PdfFigure[];
	columns: { first: string; second: string; task: string; tracked: string; earnings: string; activity: string };
	showsEarnings: boolean;
	groups: PdfGroup[];
	footer: string;
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
	filters: {
		marginBottom: 12,
		paddingVertical: 6,
		borderTopWidth: 0.5,
		borderBottomWidth: 0.5,
		borderColor: HAIRLINE
	},
	filtersTitle: { fontSize: 8, color: MUTED, marginBottom: 3 },
	filterLine: { fontSize: 9, marginBottom: 2 },
	summary: { flexDirection: 'row', marginBottom: 14, borderWidth: 0.5, borderColor: HAIRLINE, borderRadius: 6 },
	summaryCell: { flex: 1, paddingVertical: 8, paddingHorizontal: 10, borderLeftWidth: 0.5, borderColor: HAIRLINE },
	summaryFirstCell: { flex: 1, paddingVertical: 8, paddingHorizontal: 10 },
	summaryLabel: { fontSize: 8, color: MUTED, marginBottom: 3 },
	summaryValue: { fontSize: 12, fontFamily: 'Helvetica-Bold' },
	tableHeader: { flexDirection: 'row', paddingVertical: 5, borderBottomWidth: 0.5, borderColor: HAIRLINE },
	headerCell: { fontSize: 8, color: MUTED },
	groupRow: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 4, backgroundColor: BAND, marginTop: 6 },
	groupTitle: { fontFamily: 'Helvetica-Bold' },
	row: {
		flexDirection: 'row',
		paddingVertical: 4,
		paddingHorizontal: 4,
		borderBottomWidth: 0.5,
		borderColor: HAIRLINE
	},
	first: { width: '20%', paddingRight: 6 },
	second: { width: '18%', paddingRight: 6 },
	task: { flex: 1, paddingRight: 6 },
	figure: { width: '11%', textAlign: 'right' },
	muted: { color: MUTED },
	footer: {
		position: 'absolute',
		bottom: 20,
		left: 32,
		right: 32,
		flexDirection: 'row',
		justifyContent: 'space-between',
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

function SummaryBand({ summary }: Readonly<{ summary: PdfFigure[] }>) {
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

function FiltersBlock({ title, filters }: Readonly<{ title: string; filters: PdfFigure[] }>) {
	return (
		<View style={styles.filters}>
			<Text style={styles.filtersTitle}>{title}</Text>
			{filters.map((filter) => (
				<Text key={filter.label} style={styles.filterLine}>
					{`${filter.label}: ${filter.value}`}
				</Text>
			))}
		</View>
	);
}

function TableHeader({ content }: Readonly<{ content: TimeActivityPdfContent }>) {
	const { columns } = content;
	return (
		<View style={styles.tableHeader} fixed>
			<Text style={[styles.headerCell, styles.first]}>{columns.first}</Text>
			<Text style={[styles.headerCell, styles.second]}>{columns.second}</Text>
			<Text style={[styles.headerCell, styles.task]}>{columns.task}</Text>
			<Text style={[styles.headerCell, styles.figure]}>{columns.tracked}</Text>
			{content.showsEarnings && <Text style={[styles.headerCell, styles.figure]}>{columns.earnings}</Text>}
			<Text style={[styles.headerCell, styles.figure]}>{columns.activity}</Text>
		</View>
	);
}

function GroupBlock({ group, showsEarnings }: Readonly<{ group: PdfGroup; showsEarnings: boolean }>) {
	return (
		<View>
			<View style={styles.groupRow} wrap={false}>
				<Text style={[styles.groupTitle, { flex: 1 }]}>{group.title}</Text>
				<Text style={[styles.groupTitle, styles.figure]}>{group.tracked}</Text>
				{showsEarnings && <Text style={[styles.groupTitle, styles.figure]}>{group.earnings}</Text>}
				<Text style={[styles.groupTitle, styles.figure]}>{group.activity}</Text>
			</View>
			{group.rows.map((row) => (
				<View key={row.key} style={styles.row} wrap={false}>
					<Text style={styles.first}>{row.first}</Text>
					<Text style={[styles.second, styles.muted]}>{row.second}</Text>
					<Text style={styles.task}>{row.task}</Text>
					<Text style={styles.figure}>{row.tracked}</Text>
					{showsEarnings && <Text style={styles.figure}>{row.earnings}</Text>}
					<Text style={styles.figure}>{row.activity}</Text>
				</View>
			))}
		</View>
	);
}

/** Imported on the click with the renderer; every string arrives translated and formatted. */
export function buildTimeActivityPdf(content: TimeActivityPdfContent): ReactElement<DocumentProps> {
	const hasFilters = content.filters.length > 0;
	return (
		<Document title={content.title}>
			<Page size="A4" style={styles.page}>
				<View style={styles.header}>
					<Text style={styles.title}>{content.title}</Text>
					<Text style={styles.meta}>{content.period}</Text>
					<Text style={styles.meta}>{content.generatedOn}</Text>
				</View>
				{hasFilters && <FiltersBlock title={content.filtersTitle} filters={content.filters} />}
				<SummaryBand summary={content.summary} />
				<TableHeader content={content} />
				{content.groups.map((group) => (
					<GroupBlock key={group.key} group={group} showsEarnings={content.showsEarnings} />
				))}
				<View style={styles.footer} fixed>
					<Text>{content.footer}</Text>
					<Text render={({ pageNumber, totalPages }) => content.pageLabel(pageNumber, totalPages)} />
				</View>
			</Page>
		</Document>
	);
}
