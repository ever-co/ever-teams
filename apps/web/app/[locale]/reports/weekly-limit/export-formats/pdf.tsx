'use client';

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { DottedLanguageObjectStringPaths } from 'next-intl';
import { WeeklyLimitTableDataType } from '../components/data-table';
import { ITimeReportTableProps } from '../components/time-report-table';

const styles = StyleSheet.create({
	page: { padding: 20 },
	table: { display: 'flex', flexDirection: 'column', width: '100%', fontWeight: '400', fontSize: '10px' },
	row: { display: 'flex', flexDirection: 'column' },
	rowHeader: {
		backgroundColor: 'rgba(0, 0, 0, 0.1',
		height: '10px',
		display: 'flex',
		alignItems: 'center',
		paddingHorizontal: '4px'
	},
	cell: { borderWidth: 0.25, padding: 2, paddingLeft: 4 },
	headerRow: { backgroundColor: '#6755C9', fontWeight: 'bold', color: 'white' },
	headerCell: { paddingVertical: 4 },
	projectCells: { width: '20%' },
	statusCells: { width: '9%' },
	dateCells: { width: '10%' },
	membersCells: { width: '17%' },
	managersCells: { width: '17%' },
	teamsCells: { width: '17%' }
});

export const PDFDocument = ({
	data,
	headers,
	limit
}: {
	data: ITimeReportTableProps[];
	headers: Record<keyof WeeklyLimitTableDataType, DottedLanguageObjectStringPaths>;
	limit: number;
}) => {
	return (
		<Document style={{ width: '100%', height: '40rem' }}>
			<Page size="A4" orientation="landscape" style={styles.page}>
				{/**
				 * Title
				 */}
				<View style={{ width: '100%', marginBottom: '20px' }}>
					<Text style={{ fontSize: '12px', color: '#6755C9' }}>{'title'}</Text>
				</View>

				<View>
					{data.map((el, idx) => {
						return (
							<View key={idx} style={{ marginBottom: '10px' }}>
								<Text style={{ fontSize: '14px', fontWeight: 'bold', color: '#111827' }}>
									{headers.indexValue}
								</Text>
								<Table
									data={el.report.employees?.map((item) => {
										const percentageUsed = (item.duration / limit) * 100;
										const remaining = limit - item.duration;

										return {
											indexValue: item.employee.fullName,
											limit,
											percentageUsed,
											timeSpent: item.duration,
											remaining
										};
									})}
									headers={headers}
								/>
							</View>
						);
					})}
				</View>
			</Page>
		</Document>
	);
};

function Table({
	data,
	headers
}: {
	data: WeeklyLimitTableDataType[];
	headers: Record<keyof WeeklyLimitTableDataType, DottedLanguageObjectStringPaths>;
}) {
	const Row = (row: WeeklyLimitTableDataType) => (
		<View style={styles.row}>
			<Text style={[styles.cell, styles.projectCells]}>{row.indexValue}</Text>
			<Text style={[styles.cell, styles.statusCells]}>{row.timeSpent}</Text>
			<Text style={[styles.cell, styles.dateCells]}>{row.limit}</Text>
			<Text style={[styles.cell, styles.dateCells]}>{row.percentageUsed}</Text>
			<Text style={[styles.cell, styles.membersCells]}>{row.remaining}</Text>
		</View>
	);

	return (
		<View style={styles.table}>
			{/**
			 * Header
			 */}
			<View key={0} style={[styles.headerRow, styles.row]}>
				<Text style={[styles.cell, styles.headerCell, styles.projectCells]}>{headers.indexValue}</Text>
				<Text style={[styles.cell, styles.headerCell, styles.statusCells]}>{headers.timeSpent}</Text>
				<Text style={[styles.cell, styles.headerCell, styles.dateCells]}>{headers.limit}</Text>
				<Text style={[styles.cell, styles.headerCell, styles.dateCells]}>{headers.percentageUsed}</Text>
				<Text style={[styles.cell, styles.headerCell, styles.membersCells]}>{headers.remaining}</Text>
			</View>
			{/**
			 * Body
			 */}
			{data.map((el, i) => (
				<Row {...el} key={i} />
			))}
		</View>
	);
}
