/* eslint-disable jsx-a11y/alt-text */
'use client';

import { format } from 'date-fns';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import {
	IActivityReportGroupByDate,
	IActivityItem,
	IProjectWithActivity
} from '@/core/types/interfaces/-activity/IActivityReport';
import { formatDuration } from './productivity-application-table';

Font.register({
	family: 'Helvetica',
	src: 'https://fonts.gstatic.com/s/helveticaneue/v70/1Ptsg8zYS_SKggPNyC0IT0kLW-43aMEzIO6XUTLjad8.ttf'
});

const styles = StyleSheet.create({
	page: { padding: 30, fontFamily: 'Inter' },
	header: { marginBottom: 20, borderBottom: '2 solid #E5E7EB', paddingBottom: 10 },
	title: { fontSize: 24, fontWeight: 'bold', color: '#111827', textAlign: 'center' },
	subtitle: { fontSize: 12, color: '#6B7280', textAlign: 'center', marginTop: 5 },
	table: { width: '100%', borderStyle: 'solid', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 4 },
	tableHeader: {
		backgroundColor: '#f9fafb',
		flexDirection: 'row',
		borderBottomWidth: 1,
		borderBottomColor: '#e5e7eb'
	},
	tableHeaderCell: { padding: 12, fontSize: 12, fontWeight: 'bold', color: '#4b5563' },
	appHeader: { backgroundColor: '#f3f4f6', padding: 12, fontSize: 14, fontWeight: 'bold', color: '#111827' },
	tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
	tableCell: { padding: 12, fontSize: 12, color: '#374151' },
	projectCell: { flexDirection: 'row', alignItems: 'center', padding: 4 },
	memberCell: { flexDirection: 'row', alignItems: 'center', padding: 4 },
	progressBar: { width: '70%', height: 6, backgroundColor: '#e5e7eb', borderRadius: 3, marginRight: 8 },
	progressFill: { height: '100%', backgroundColor: '#3b82f6', borderRadius: 3 },
	col1: { width: '25%' },
	col2: { width: '20%' },
	col3: { width: '25%' },
	col4: { width: '15%' },
	col5: { width: '15%' }
});
interface ProductivityPDFProps {
	data: IActivityReportGroupByDate[];
	title?: string;
}
const COLUMN_WIDTHS = {
	col1: '25%',
	col2: '20%',
	col3: '25%',
	col4: '15%',
	col5: '15%'
} as const;

const TABLE_HEADERS = ['Date', 'Project', 'Member', 'Time Spent', 'Percent Used'] as const;

const TableHeader = () => (
	<View style={styles.tableHeader}>
		{TABLE_HEADERS.map((header, index) => (
			<View
				key={header}
				style={[
					styles.tableHeaderCell,
					{ width: COLUMN_WIDTHS[`col${index + 1}` as keyof typeof COLUMN_WIDTHS] }
				]}
			>
				<Text>{header}</Text>
			</View>
		))}
	</View>
);

const ProgressBar = ({ percentage }: { percentage: string }) => {
	const roundedPercentage = Math.round(parseFloat(percentage));
	return (
		<View style={styles.progressBar}>
			<View style={[styles.progressFill, { width: `${percentage}%` }]} />
			<Text>{roundedPercentage}%</Text>
		</View>
	);
};

interface ActivityRowProps {
	date: string;
	activity: IActivityItem;
	employee: { fullName: string };
	projectName: string;
	appName: string;
	index: number;
}

const ActivityRow = ({ date, activity, employee, projectName, appName, index }: ActivityRowProps) => (
	<View key={`${appName}-${date}-${index}`} style={styles.tableRow}>
		<View style={[styles.tableCell, { width: COLUMN_WIDTHS.col1 }]}>
			<Text>{format(new Date(date), 'EEEE dd MMM yyyy')}</Text>
		</View>
		<View style={[styles.tableCell, { width: COLUMN_WIDTHS.col2 }]}>
			<View style={styles.projectCell}>
				<Text>{projectName}</Text>
			</View>
		</View>
		<View style={[styles.tableCell, { width: COLUMN_WIDTHS.col3 }]}>
			<View style={styles.memberCell}>
				<Text>{employee.fullName}</Text>
			</View>
		</View>
		<View style={[styles.tableCell, { width: COLUMN_WIDTHS.col4 }]}>
			<Text>{formatDuration(activity.duration.toString())}</Text>
		</View>
		<View style={[styles.tableCell, { width: COLUMN_WIDTHS.col5 }]}>
			<ProgressBar percentage={activity.duration_percentage} />
		</View>
	</View>
);

export function ProductivityApplicationPDF({ data, title }: ProductivityPDFProps) {
	const groupedByApp = data.reduce(
		(apps, dayData) => {
			dayData.employees.forEach((employeeData) => {
				employeeData.projects.forEach((projectData: IProjectWithActivity) => {
					projectData.activity.forEach((activity: IActivityItem) => {
						if (!apps[activity.title]) apps[activity.title] = [];
						const projectName = projectData.project?.name || activity.project?.name || 'Ever Teams';
						apps[activity.title].push({
							date: dayData.date,
							activity,
							employee: activity.employee,
							projectName
						});
					});
				});
			});
			return apps;
		},
		{} as Record<
			string,
			Array<{ date: string; activity: IActivityItem; employee: { fullName: string }; projectName: string }>
		>
	);

	const today = new Date().toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});

	return (
		<Document>
			<Page size="A4" orientation="landscape" style={styles.page}>
				<View style={styles.header}>
					<Text style={styles.title}>{title}</Text>
					<Text style={styles.subtitle}>Generated on {today}</Text>
				</View>
				<View style={styles.table}>
					<TableHeader />
					{Object.entries(groupedByApp).map(([appName, activities]) => (
						<View key={appName}>
							<View style={styles.appHeader}>
								<Text>{appName}</Text>
							</View>
							{activities.map((activityData, index) => (
								<ActivityRow
									key={`${appName}-${activityData.date}-${index}`}
									{...activityData}
									appName={appName}
									index={index}
								/>
							))}
						</View>
					))}
				</View>
			</Page>
		</Document>
	);
}
