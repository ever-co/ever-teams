import type { ReactElement } from 'react';
import { Document, type DocumentProps, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

export interface PaymentsPdfRow {
	key: string;
	member: string;
	rate: string;
	tracked: string;
	owed: string;
}

export interface PaymentsPdfTotal {
	key: string;
	label: string;
	members: string;
	tracked: string;
	owed: string;
}

export interface PaymentsPdfContent {
	title: string;
	period: string;
	generatedOn: string;
	note: string;
	columns: { member: string; rate: string; tracked: string; owed: string };
	rows: PaymentsPdfRow[];
	totals: PaymentsPdfTotal[];
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
	note: { fontSize: 8, color: MUTED, marginTop: 4 },
	tableHeader: { flexDirection: 'row', paddingVertical: 5, borderBottomWidth: 0.5, borderColor: HAIRLINE },
	headerCell: { fontSize: 8, color: MUTED },
	row: { flexDirection: 'row', paddingVertical: 5, borderBottomWidth: 0.5, borderColor: HAIRLINE },
	totalRow: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 0, backgroundColor: BAND },
	totalText: { fontFamily: 'Helvetica-Bold' },
	memberCell: { flex: 2.2, paddingRight: 6 },
	figureCell: { flex: 1, textAlign: 'right', paddingLeft: 6 },
	owedCell: { flex: 1.1, textAlign: 'right', paddingLeft: 6, fontFamily: 'Helvetica-Bold' },
	totalMeta: { color: MUTED, fontFamily: 'Helvetica' },
	footer: {
		position: 'absolute',
		bottom: 20,
		left: 32,
		right: 32,
		fontSize: 8,
		color: MUTED,
		textAlign: 'right'
	}
});

export function PaymentsDuePdfDocument({
	content
}: Readonly<{ content: PaymentsPdfContent }>): ReactElement<DocumentProps> {
	const { columns } = content;
	return (
		<Document title={content.title}>
			<Page size="A4" style={styles.page}>
				<View style={styles.header}>
					<Text style={styles.title}>{content.title}</Text>
					<Text style={styles.meta}>{content.period}</Text>
					<Text style={styles.meta}>{content.generatedOn}</Text>
					<Text style={styles.note}>{content.note}</Text>
				</View>
				<View style={styles.tableHeader} fixed>
					<Text style={[styles.headerCell, styles.memberCell]}>{columns.member}</Text>
					<Text style={[styles.headerCell, styles.figureCell]}>{columns.rate}</Text>
					<Text style={[styles.headerCell, styles.figureCell]}>{columns.tracked}</Text>
					<Text style={[styles.headerCell, styles.figureCell]}>{columns.owed}</Text>
				</View>
				{content.rows.map((row) => (
					<View key={row.key} style={styles.row} wrap={false}>
						<Text style={styles.memberCell}>{row.member}</Text>
						<Text style={styles.figureCell}>{row.rate}</Text>
						<Text style={styles.figureCell}>{row.tracked}</Text>
						<Text style={styles.owedCell}>{row.owed}</Text>
					</View>
				))}
				{content.totals.map((total) => (
					<View key={total.key} style={styles.totalRow} wrap={false}>
						<Text style={[styles.memberCell, styles.totalText]}>
							{total.label} <Text style={styles.totalMeta}>{total.members}</Text>
						</Text>
						<Text style={styles.figureCell} />
						<Text style={[styles.figureCell, styles.totalText]}>{total.tracked}</Text>
						<Text style={styles.owedCell}>{total.owed}</Text>
					</View>
				))}
				<Text
					style={styles.footer}
					fixed
					render={({ pageNumber, totalPages }) => content.pageLabel(pageNumber, totalPages)}
				/>
			</Page>
		</Document>
	);
}
