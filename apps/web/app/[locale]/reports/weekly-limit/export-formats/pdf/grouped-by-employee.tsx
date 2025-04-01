'use client';

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { DottedLanguageObjectStringPaths } from 'next-intl';
import { WeeklyLimitTableDataType } from '../../components/data-table';
import { ITimeLimitReport } from '@/app/interfaces/ITimeLimits';
import moment from 'moment';
import { DEFAULT_WORK_HOURS_PER_DAY } from '@/app/constants';
import { formatIntegerToHour, formatTimeString } from '@/app/helpers';

const styles = StyleSheet.create({
	page: { padding: 20 },
	table: { display: 'flex', flexDirection: 'column', width: '100%', fontWeight: '400', fontSize: '10px' },
	row: { display: 'flex', flexDirection: 'row' },
	rowHeader: {
		backgroundColor: 'rgba(0, 0, 0, 0.1)',
		height: '10px',
		display: 'flex',
		alignItems: 'center',
		paddingHorizontal: '4px'
	},
	cell: { borderWidth: 0.25, padding: 2, paddingLeft: 4 },
	headerRow: { backgroundColor: '#6755C9', fontWeight: 'bold', color: 'white' },
	headerCell: { paddingVertical: 4 },
	indexValue: { width: '25%' },
	timeSpent: { width: '15%' },
	percentageUsed: { width: '30%' },
	limit: { width: '15%' },
	remaining: { width: '15%' }
});

export const WeeklyLimitByEmployeePDFDocument = ({
	data,
	headers,
	displayMode,
	organizationLimits,
	title
}: {
	data: ITimeLimitReport[];
	headers: Record<keyof WeeklyLimitTableDataType, DottedLanguageObjectStringPaths>;
	displayMode: 'week' | 'date';
	organizationLimits: { [key: string]: number };
	title: string;
}) => {
	return (
		<Document style={{ width: '100%', height: '40rem' }}>
			<Page size="A4" orientation="landscape" style={styles.page}>
				{/**
				 * Title
				 */}
				<View style={{ width: '100%', marginBottom: '20px' }}>
					<Text style={{ fontSize: '12px', color: '#6755C9' }}>{title}</Text>
				</View>

				<View>
					{data
						?.filter((report) =>
							displayMode === 'week'
								? moment(report.date).isSame(moment(report.date).startOf('isoWeek'), 'date')
								: true
						)
						?.map((el, idx) => {
							return (
								<View key={idx} style={{ marginBottom: '10px' }}>
									<View
										style={{
											display: 'flex',
											alignItems: 'center',
											gap: '0.3rem',
											flexDirection: 'row',
											padding: '5px',
											backgroundColor: '#F8F8F8',
											borderRadius: '4px',
											fontSize: '10px',
											fontWeight: 'bold'
										}}
									>
										{displayMode === 'week' ? (
											<>
												<Text>{el.date}</Text>
												<Text style={{ paddingHorizontal: '0.2rem' }}>-</Text>
												<Text>{moment(el.date).endOf('week').format('YYYY-MM-DD')}</Text>
											</>
										) : (
											<Text>{el.date}</Text>
										)}
									</View>
									<Table
										data={el.employees?.map((item) => {
											const limit =
												item.limit ||
												organizationLimits[displayMode] ||
												DEFAULT_WORK_HOURS_PER_DAY;
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
			<Text style={[styles.cell, styles.indexValue]}>{row.indexValue}</Text>
			<Text style={[styles.cell, styles.timeSpent]}>
				{formatTimeString(formatIntegerToHour(Number(row.timeSpent) / 3600))}
			</Text>
			<Text style={[styles.cell, styles.limit]}>
				{formatTimeString(formatIntegerToHour(Number(row.limit) / 3600))}
			</Text>
			<Text style={[styles.cell, styles.percentageUsed]}>{`${Number(row.percentageUsed).toFixed(2)}%`}</Text>
			<Text style={[styles.cell, styles.remaining]}>
				{Number(row.percentageUsed) > 100 && '-'}
				{formatTimeString(formatIntegerToHour(Number(row.remaining) / 3600))}
			</Text>
		</View>
	);

	return (
		<View style={styles.table}>
			{/**
			 * Header
			 */}
			<View key={0} style={[styles.headerRow, styles.row]}>
				<Text style={[styles.cell, styles.headerCell, styles.indexValue]}>{headers.indexValue}</Text>
				<Text style={[styles.cell, styles.headerCell, styles.timeSpent]}>{headers.timeSpent}</Text>
				<Text style={[styles.cell, styles.headerCell, styles.limit]}>{headers.limit}</Text>
				<Text style={[styles.cell, styles.headerCell, styles.percentageUsed]}>{headers.percentageUsed}</Text>
				<Text style={[styles.cell, styles.headerCell, styles.remaining]}>{headers.remaining}</Text>
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
