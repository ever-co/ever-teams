'use client';

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { ITimeLimitReportByEmployee } from '@/app/interfaces/ITimeLimits';
import moment from 'moment';
import { DEFAULT_WORK_HOURS_PER_DAY } from '@/app/constants';
import { IWeeklyLimitReportPDFDocumentProps, Table } from '.';

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
}: IWeeklyLimitReportPDFDocumentProps & {
	data: ITimeLimitReportByEmployee[];
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
					{data?.map((el, idx) => {
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
									<Text>{el?.employee?.fullName}</Text>
								</View>
								<Table
									data={el.reports?.map((item) => {
										const limit =
											item.limit || organizationLimits[displayMode] || DEFAULT_WORK_HOURS_PER_DAY;
										const percentageUsed = (item.duration / limit) * 100;
										const remaining = limit - item.duration;

										return {
											indexValue:
												displayMode == 'week'
													? `${item.date} - ${moment(item.date).endOf('week').format('YYYY-MM-DD')}`
													: item.date,
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
