import type { ReactElement } from 'react';
import { Document, type DocumentProps, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

export interface BudgetPdfFigure {
	label: string;
	value: string;
}

export interface BudgetPdfRow {
	key: string;
	project: string;
	type: string;
	budget: string;
	spent: string;
	remaining: string;
	used: string;
	status: string;
}

export interface BudgetPdfGroup {
	key: string;
	title: string;
	rows: BudgetPdfRow[];
}

export interface ProjectBudgetPdfContent {
	title: string;
	scope: string;
	generatedOn: string;
	summary: BudgetPdfFigure[];
	notes: string[];
	columns: Omit<BudgetPdfRow, 'key'>;
	groups: BudgetPdfGroup[];
	totals: BudgetPdfRow[];
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
	summary: { flexDirection: 'row', marginBottom: 8, borderWidth: 0.5, borderColor: HAIRLINE, borderRadius: 6 },
	summaryCell: { flex: 1, paddingVertical: 8, paddingHorizontal: 10, borderLeftWidth: 0.5, borderColor: HAIRLINE },
	summaryFirstCell: { flex: 1, paddingVertical: 8, paddingHorizontal: 10 },
	summaryLabel: { fontSize: 8, color: MUTED, marginBottom: 3 },
	summaryValue: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
	notes: { fontSize: 8, color: MUTED, marginBottom: 12 },
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
	totalRow: {
		flexDirection: 'row',
		paddingVertical: 5,
		paddingHorizontal: 4,
		borderTopWidth: 0.5,
		borderColor: HAIRLINE,
		fontFamily: 'Helvetica-Bold'
	},
	project: { flex: 1, paddingRight: 6 },
	type: { width: '12%', paddingRight: 6 },
	figure: { width: '12%', textAlign: 'right', paddingLeft: 4 },
	used: { width: '8%', textAlign: 'right', paddingLeft: 4 },
	status: { width: '13%', paddingLeft: 8 },
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

function RowCells({ row }: Readonly<{ row: Omit<BudgetPdfRow, 'key'> }>) {
	return (
		<>
			<Text style={styles.project}>{row.project}</Text>
			<Text style={styles.type}>{row.type}</Text>
			<Text style={styles.figure}>{row.budget}</Text>
			<Text style={styles.figure}>{row.spent}</Text>
			<Text style={styles.figure}>{row.remaining}</Text>
			<Text style={styles.used}>{row.used}</Text>
			<Text style={styles.status}>{row.status}</Text>
		</>
	);
}

export function buildProjectBudgetPdf(content: ProjectBudgetPdfContent): ReactElement<DocumentProps> {
	const hasNotes = content.notes.length > 0;
	return (
		<Document title={content.title}>
			<Page size="A4" orientation="landscape" style={styles.page}>
				<View style={styles.header}>
					<Text style={styles.title}>{content.title}</Text>
					<Text style={styles.meta}>{content.scope}</Text>
					<Text style={styles.meta}>{content.generatedOn}</Text>
				</View>
				<View style={styles.summary}>
					{content.summary.map((figure, index) => (
						<View key={figure.label} style={summaryCellStyleOf(index)}>
							<Text style={styles.summaryLabel}>{figure.label}</Text>
							<Text style={styles.summaryValue}>{figure.value}</Text>
						</View>
					))}
				</View>
				{hasNotes && <Text style={styles.notes}>{content.notes.join(' ')}</Text>}
				<View style={[styles.tableHeader, styles.headerCell]} fixed>
					<RowCells row={content.columns} />
				</View>
				{content.groups.map((group) => (
					<View key={group.key}>
						<View style={styles.groupRow} wrap={false}>
							<Text style={styles.groupTitle}>{group.title}</Text>
						</View>
						{group.rows.map((row) => (
							<View key={row.key} style={styles.row} wrap={false}>
								<RowCells row={row} />
							</View>
						))}
					</View>
				))}
				{content.totals.map((total) => (
					<View key={total.key} style={styles.totalRow} wrap={false}>
						<RowCells row={total} />
					</View>
				))}
				<View style={styles.footer} fixed>
					<Text render={({ pageNumber, totalPages }) => content.pageLabel(pageNumber, totalPages)} />
				</View>
			</Page>
		</Document>
	);
}
