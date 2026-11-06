import type { ReactElement } from 'react';
import { Document, Page, StyleSheet, Text, View, type DocumentProps } from '@react-pdf/renderer';
import type { AppsUrlsPdfData, AppsUrlsPdfGroup, AppsUrlsPdfLine } from './apps-urls-pdf-data';

/** Print colours: the app's ink, muted text and hairline, written out because a PDF cannot read the CSS tokens. */
const INK = '#18181b';
const MUTED = '#66666e';
const HAIRLINE = '#e2e2e5';
const BAND = '#f7f7f8';

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
	subtitle: { marginTop: 4, fontSize: 10, color: MUTED },
	generated: { marginTop: 2, fontSize: 8, color: MUTED },
	figures: {
		flexDirection: 'row',
		marginTop: 16,
		marginBottom: 16,
		borderTopWidth: 0.5,
		borderBottomWidth: 0.5,
		borderColor: HAIRLINE
	},
	figure: { flex: 1, paddingVertical: 8, paddingRight: 8 },
	figureLabel: { fontSize: 8, color: MUTED },
	figureValue: { marginTop: 3, fontSize: 12, fontFamily: 'Helvetica-Bold' },
	row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 4 },
	headerRow: { borderBottomWidth: 0.5, borderColor: HAIRLINE, color: MUTED, fontSize: 8 },
	groupRow: { backgroundColor: BAND, borderTopWidth: 0.5, borderColor: HAIRLINE, fontFamily: 'Helvetica-Bold' },
	lineLead: { paddingLeft: 10 },
	groupMeta: { fontFamily: 'Helvetica', color: MUTED, fontSize: 8 },
	totalsRow: { borderTopWidth: 0.5, borderColor: HAIRLINE, fontFamily: 'Helvetica-Bold', marginTop: 2 },
	numeric: { textAlign: 'right' },
	muted: { color: MUTED },
	pageNumber: { position: 'absolute', bottom: 24, right: 36, fontSize: 8, color: MUTED }
});

interface ColumnWidths {
	lead: string;
	side: string;
	time: string;
	share: string;
}

function columnWidthsOf(data: AppsUrlsPdfData): ColumnWidths {
	const showsBoth = data.showsMember && data.showsProject;
	if (showsBoth) {
		return { lead: '38%', side: '20%', time: '12%', share: '10%' };
	}
	return { lead: '48%', side: '30%', time: '12%', share: '10%' };
}

function SideCells({
	data,
	widths,
	member,
	project
}: Readonly<{ data: AppsUrlsPdfData; widths: ColumnWidths; member: string; project: string }>) {
	return (
		<>
			{data.showsMember && <Text style={{ width: widths.side }}>{member}</Text>}
			{data.showsProject && <Text style={{ width: widths.side }}>{project}</Text>}
		</>
	);
}

function Line({
	line,
	data,
	widths
}: Readonly<{ line: AppsUrlsPdfLine; data: AppsUrlsPdfData; widths: ColumnWidths }>) {
	return (
		<View style={styles.row} wrap={false}>
			<Text style={[styles.lineLead, { width: widths.lead }]}>{line.lead}</Text>
			<SideCells data={data} widths={widths} member={line.member} project={line.project} />
			<Text style={[styles.numeric, { width: widths.time }]}>{line.time}</Text>
			<Text style={[styles.numeric, styles.muted, { width: widths.share }]}>{line.share}</Text>
		</View>
	);
}

function Group({
	group,
	data,
	widths
}: Readonly<{ group: AppsUrlsPdfGroup; data: AppsUrlsPdfData; widths: ColumnWidths }>) {
	return (
		<View>
			<View style={[styles.row, styles.groupRow]} wrap={false} minPresenceAhead={24}>
				<Text style={{ width: widths.lead }}>
					{group.label}
					<Text style={styles.groupMeta}>{`  ${group.meta}`}</Text>
				</Text>
				<SideCells data={data} widths={widths} member="" project="" />
				<Text style={[styles.numeric, { width: widths.time }]}>{group.time}</Text>
				<Text style={[styles.numeric, { width: widths.share }]}>{group.share}</Text>
			</View>
			{group.lines.map((line) => (
				<Line key={line.key} line={line} data={data} widths={widths} />
			))}
		</View>
	);
}

export function appsUrlsPdfDocumentOf(data: AppsUrlsPdfData): ReactElement<DocumentProps> {
	const widths = columnWidthsOf(data);
	return (
		<Document title={`${data.title} ${data.subtitle}`}>
			<Page size="A4" style={styles.page} wrap>
				<Text style={styles.title}>{data.title}</Text>
				<Text style={styles.subtitle}>{data.subtitle}</Text>
				<Text style={styles.generated}>{data.generated}</Text>
				<View style={styles.figures}>
					{data.figures.map((figure) => (
						<View key={figure.label} style={styles.figure}>
							<Text style={styles.figureLabel}>{figure.label}</Text>
							<Text style={styles.figureValue}>{figure.value}</Text>
						</View>
					))}
				</View>
				<View style={[styles.row, styles.headerRow]}>
					<Text style={{ width: widths.lead }}>{data.columns.lead}</Text>
					<SideCells
						data={data}
						widths={widths}
						member={data.columns.member}
						project={data.columns.project}
					/>
					<Text style={[styles.numeric, { width: widths.time }]}>{data.columns.time}</Text>
					<Text style={[styles.numeric, { width: widths.share }]}>{data.columns.share}</Text>
				</View>
				{data.groups.map((group) => (
					<Group key={group.key} group={group} data={data} widths={widths} />
				))}
				<View style={[styles.row, styles.totalsRow]} wrap={false}>
					<Text style={{ width: widths.lead }}>{data.totals.label}</Text>
					<SideCells data={data} widths={widths} member="" project="" />
					<Text style={[styles.numeric, { width: widths.time }]}>{data.totals.time}</Text>
					<Text style={{ width: widths.share }} />
				</View>
				<Text
					style={styles.pageNumber}
					fixed
					render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
				/>
			</Page>
		</Document>
	);
}
