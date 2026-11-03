import type { ReactElement } from 'react';
import { Document, type DocumentProps, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

export interface TeamReportPdfRow {
	key: string;
	date: string;
	member: string;
	project: string;
	tracked: string;
	activity: string;
}

export interface TeamReportPdfFigure {
	label: string;
	value: string;
}

export interface TeamReportPdfInput {
	title: string;
	periodText: string;
	scopeText: string;
	generatedText: string;
	figures: ReadonlyArray<TeamReportPdfFigure>;
	columns: Record<'date' | 'member' | 'project' | 'tracked' | 'activity', string>;
	rows: ReadonlyArray<TeamReportPdfRow>;
	totalLabel: string;
	totalTracked: string;
	totalActivity: string;
}

const INK = '#18181b';
const MUTED = '#66666e';
const HAIRLINE = '#e4e4e7';
const BAND = '#f4f4f5';

const styles = StyleSheet.create({
	page: {
		paddingTop: 36,
		paddingBottom: 48,
		paddingHorizontal: 36,
		fontFamily: 'Helvetica',
		fontSize: 9,
		color: INK
	},
	title: { fontSize: 16, fontFamily: 'Helvetica-Bold' },
	meta: { marginTop: 4, color: MUTED },
	figures: {
		flexDirection: 'row',
		marginTop: 16,
		marginBottom: 16,
		borderWidth: 0.5,
		borderColor: HAIRLINE,
		borderRadius: 6
	},
	figure: { flex: 1, paddingVertical: 8, paddingHorizontal: 10 },
	figureDivider: { borderLeftWidth: 0.5, borderLeftColor: HAIRLINE },
	figureLabel: { color: MUTED, fontSize: 8 },
	figureValue: { marginTop: 3, fontSize: 12, fontFamily: 'Helvetica-Bold' },
	headerRow: {
		flexDirection: 'row',
		paddingVertical: 5,
		borderBottomWidth: 0.5,
		borderBottomColor: HAIRLINE,
		color: MUTED,
		fontSize: 8
	},
	row: { flexDirection: 'row', paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: HAIRLINE },
	totalRow: { flexDirection: 'row', paddingVertical: 6, backgroundColor: BAND, fontFamily: 'Helvetica-Bold' },
	dateCell: { width: '18%', paddingRight: 6 },
	memberCell: { width: '26%', paddingRight: 6 },
	projectCell: { width: '30%', paddingRight: 6 },
	trackedCell: { width: '14%', textAlign: 'right', paddingRight: 6 },
	activityCell: { width: '12%', textAlign: 'right' },
	footer: { position: 'absolute', bottom: 24, left: 36, right: 36, flexDirection: 'row', color: MUTED, fontSize: 8 },
	footerText: { flex: 1 }
});

function pageNumberOf({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) {
	return `${pageNumber} / ${totalPages}`;
}

function figureStyleOf(index: number) {
	if (index === 0) {
		return styles.figure;
	}
	return [styles.figure, styles.figureDivider];
}

/**
 * The team report as printed rows: one line per day, member and project, durations written as hours and minutes and
 * activity as a percentage, under the period's figures. Built on the click by `downloadPdf`, never on page load.
 */
export function teamReportDocumentOf(input: TeamReportPdfInput): ReactElement<DocumentProps> {
	return (
		<Document title={input.title}>
			<Page size="A4" style={styles.page} wrap>
				<Text style={styles.title}>{input.title}</Text>
				<Text style={styles.meta}>{input.periodText}</Text>
				<Text style={styles.meta}>{input.scopeText}</Text>
				<View style={styles.figures}>
					{input.figures.map((figure, index) => (
						<View key={figure.label} style={figureStyleOf(index)}>
							<Text style={styles.figureLabel}>{figure.label}</Text>
							<Text style={styles.figureValue}>{figure.value}</Text>
						</View>
					))}
				</View>
				<View style={styles.headerRow} fixed>
					<Text style={styles.dateCell}>{input.columns.date}</Text>
					<Text style={styles.memberCell}>{input.columns.member}</Text>
					<Text style={styles.projectCell}>{input.columns.project}</Text>
					<Text style={styles.trackedCell}>{input.columns.tracked}</Text>
					<Text style={styles.activityCell}>{input.columns.activity}</Text>
				</View>
				{input.rows.map((row) => (
					<View key={row.key} style={styles.row} wrap={false}>
						<Text style={styles.dateCell}>{row.date}</Text>
						<Text style={styles.memberCell}>{row.member}</Text>
						<Text style={styles.projectCell}>{row.project}</Text>
						<Text style={styles.trackedCell}>{row.tracked}</Text>
						<Text style={styles.activityCell}>{row.activity}</Text>
					</View>
				))}
				<View style={styles.totalRow} wrap={false}>
					<Text style={styles.dateCell}>{input.totalLabel}</Text>
					<Text style={styles.memberCell} />
					<Text style={styles.projectCell} />
					<Text style={styles.trackedCell}>{input.totalTracked}</Text>
					<Text style={styles.activityCell}>{input.totalActivity}</Text>
				</View>
				<View style={styles.footer} fixed>
					<Text style={styles.footerText}>{input.generatedText}</Text>
					<Text render={pageNumberOf} />
				</View>
			</Page>
		</Document>
	);
}
