'use client';

import { ITimeLogGroupedDailyReport } from '@/core/types/interfaces/activity/activity-report';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';

type ColumnId = 'member' | 'totalTime' | 'tracked' | 'manual' | 'active' | 'idle' | 'unknown' | 'activity';

type CellContent = {
	text: string;
	style?: any;
};

type TableColumn = {
	id: ColumnId;
	label: string;
	width: string;
	style: 'memberCell' | 'tableCell';
	textStyle?: 'text' | 'percentageText';
	getValue: (activity: ITimeLogGroupedDailyReport) => CellContent;
};

const TABLE_COLUMNS: TableColumn[] = [
	{
		id: 'member',
		label: 'Member',
		width: '20%',
		style: 'memberCell',
		textStyle: 'text',
		getValue: (activity) => ({ text: getEmployeeName(activity) })
	},
	{
		id: 'totalTime',
		label: 'Total Time',
		width: '10%',
		style: 'tableCell',
		textStyle: 'text',
		getValue: (activity) => ({ text: formatDuration(getTotalTime(activity)) })
	},
	{
		id: 'tracked',
		label: 'Tracked',
		width: '10%',
		style: 'tableCell',
		textStyle: 'percentageText',
		getValue: (activity) => ({ text: getTrackedTime(activity) })
	},
	{
		id: 'manual',
		label: 'Manually Added',
		width: '10%',
		style: 'tableCell',
		textStyle: 'text',
		getValue: (activity) => ({ text: formatPercentage(getTaskDurationByType(activity, 'manual')) })
	},
	{
		id: 'active',
		label: 'Active Time',
		width: '10%',
		style: 'tableCell',
		textStyle: 'percentageText',
		getValue: (activity) => ({ text: formatPercentage(getTaskDurationByType(activity, 'active')) })
	},
	{
		id: 'idle',
		label: 'Idle Time',
		width: '10%',
		style: 'tableCell',
		textStyle: 'text',
		getValue: (activity) => ({ text: formatPercentage(getTaskDurationByType(activity, 'idle')) })
	},
	{
		id: 'unknown',
		label: 'Unknown Activity',
		width: '10%',
		style: 'tableCell',
		textStyle: 'text',
		getValue: (activity) => ({ text: formatPercentage(getTaskDurationByType(activity, 'unknown')) })
	},
	{
		id: 'activity',
		label: 'Activity Level',
		width: '10%',
		style: 'tableCell',
		textStyle: 'text',
		getValue: (activity) => ({
			text: formatPercentage(getActivityLevel(activity)),
			style: [styles.text, { color: getProgressColor(getActivityLevel(activity)) }]
		})
	}
];

const styles = StyleSheet.create({
	page: { flexDirection: 'column', backgroundColor: '#ffffff', padding: 20 },
	headerContainer: {
		alignItems: 'center',
		marginBottom: 20,
		borderBottom: 1,
		borderBottomColor: '#E5E7EB',
		paddingBottom: 16
	},
	header: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 8, textAlign: 'center' },
	dateHeader: { fontSize: 12, color: '#6B7280', textAlign: 'center', marginBottom: 8 },
	table: {
		width: '100%',
		borderStyle: 'solid',
		borderWidth: 1,
		borderRightWidth: 0,
		borderBottomWidth: 0,
		marginBottom: 16
	},
	tableRow: { flexDirection: 'row', backgroundColor: '#ffffff', width: '100%', minHeight: 32 },
	tableHeader: { backgroundColor: '#F9FAFB' },
	tableCell: {
		width: '10%',
		borderStyle: 'solid',
		borderWidth: 1,
		borderLeftWidth: 0,
		borderTopWidth: 0,
		padding: '8 6'
	},
	memberCell: {
		width: '20%',
		borderStyle: 'solid',
		borderWidth: 1,
		borderLeftWidth: 0,
		borderTopWidth: 0,
		padding: '8 6'
	},
	text: { fontSize: 10, color: '#111827' },
	headerText: { fontSize: 10, fontWeight: 'bold', color: '#111827' },
	percentageText: { fontSize: 10, color: '#10B981' },
	dateRow: { fontSize: 12, fontWeight: 'bold', backgroundColor: '#F3F4F6', padding: 8, marginTop: 8, marginBottom: 4 }
});

const getEmployeeLog = (data: ITimeLogGroupedDailyReport) => {
	return data?.logs?.[0]?.employeeLogs?.[0];
};

const getEmployeeName = (data: ITimeLogGroupedDailyReport): string => {
	return getEmployeeLog(data)?.employee?.fullName || '-';
};

const getTaskDurationByType = (data: ITimeLogGroupedDailyReport, type: string): number => {
	const employeeLog = getEmployeeLog(data);
	if (!employeeLog?.tasks) return 0;
	return (
		employeeLog.tasks.reduce(
			(sum: number, task: { description: string; duration: number }) =>
				task.description?.toLowerCase().includes(type) ? sum + task.duration : sum,
			0
		) || 0
	);
};

const getTrackedTime = (data: ITimeLogGroupedDailyReport): string => {
	const employeeLog = getEmployeeLog(data);
	const total = employeeLog?.tasks.reduce((sum, task) => sum + task.duration, 0) || 0;
	return formatPercentage(total);
};

const getActivityLevel = (data: ITimeLogGroupedDailyReport): number => {
	return getEmployeeLog(data)?.activity || 0;
};

const getProgressColor = (activityLevel: number) => {
	if (isNaN(activityLevel) || activityLevel < 0) return '#d1d5db';
	if (activityLevel > 100) return '#22c55e';
	if (activityLevel <= 20) return '#ef4444';
	if (activityLevel <= 50) return '#eab308';
	return '#22c55e';
};

const formatDuration = (duration: number) => {
	const hours = Math.floor(duration / 3600);
	const minutes = Math.floor((duration % 3600) / 60);
	const seconds = duration % 60;

	const pad = (num: number) => num.toString().padStart(2, '0');

	return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

const formatPercentage = (value: number) => {
	return `${Math.round(value)}%`;
};

const getTotalTime = (data: ITimeLogGroupedDailyReport): number => {
	if (!data?.logs) return 0;
	return data.logs.reduce((sum, log) => sum + log.employeeLogs.reduce((empSum, empLog) => empSum + empLog.sum, 0), 0);
};

interface TeamStatsPDFProps {
	rapportDailyActivity: ITimeLogGroupedDailyReport[];
	title?: string;
	startDate?: string;
	endDate?: string;
}

export function TeamStatsPDF({
	rapportDailyActivity,
	title = 'Team Activity Report',
	startDate,
	endDate
}: TeamStatsPDFProps) {
	const groupedByDate = rapportDailyActivity.reduce(
		(acc: { [key: string]: ITimeLogGroupedDailyReport[] }, curr: ITimeLogGroupedDailyReport) => {
			const date = new Date(curr.date).toLocaleDateString('en-US', {
				weekday: 'long',
				day: '2-digit',
				month: 'short',
				year: 'numeric'
			});
			if (!acc[date]) acc[date] = [];
			acc[date].push(curr);
			return acc;
		},
		{}
	);

	return (
		<Document>
			<Page size="A4" orientation="landscape" style={styles.page}>
				<View style={styles.headerContainer}>
					<Text style={styles.header}>{title}</Text>
					{(startDate || endDate) && (
						<Text style={styles.dateHeader}>
							{startDate && `From ${startDate}`}
							{startDate && endDate && ' '}
							{endDate && `To ${endDate}`}
						</Text>
					)}
				</View>

				{Object.entries(groupedByDate).map(([dateStr, activities]) => (
					<View key={dateStr}>
						<Text style={styles.dateRow}>{dateStr}</Text>
						<View style={styles.table}>
							<View style={[styles.tableRow, styles.tableHeader]}>
								{TABLE_COLUMNS.map((column) => (
									<View key={column.id} style={styles[column.style]}>
										<Text style={styles.headerText}>{column.label}</Text>
									</View>
								))}
							</View>
							{activities.map((activity: ITimeLogGroupedDailyReport, index: number) => (
								<View key={index} style={styles.tableRow}>
									{TABLE_COLUMNS.map((column) => {
										const content = column.getValue(activity);
										const textStyle =
											column.textStyle === 'percentageText' ? styles.percentageText : styles.text;
										return (
											<View key={column.id} style={styles[column.style]}>
												<Text style={content.style || textStyle}>{content.text}</Text>
											</View>
										);
									})}
								</View>
							))}
						</View>
					</View>
				))}
			</Page>
		</Document>
	);
}
