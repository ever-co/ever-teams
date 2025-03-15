/* eslint-disable jsx-a11y/alt-text */
'use client';

import { format } from 'date-fns';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import {
	IActivityReportGroupByDate,
	IActivityItem,
	IProjectWithActivity
} from '@app/interfaces/activity/IActivityReport';
import { formatDuration } from './ProductivityApplicationTable';

Font.register({
	family: 'Helvetica',
	src: 'https://fonts.gstatic.com/s/helveticaneue/v70/1Ptsg8zYS_SKggPNyC0IT0kLW-43aMEzIO6XUTLjad8.ttf'
});

const styles = StyleSheet.create({
	page: {
		padding: 30,
		fontFamily: 'Inter'
	},
    header: {
		marginBottom: 20,
		borderBottom: '2 solid #E5E7EB',
		paddingBottom: 10
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		color: '#111827',
		textAlign: 'center'
	},
	subtitle: {
		fontSize: 12,
		color: '#6B7280',
		textAlign: 'center',
		marginTop: 5
	},
	table: {
		width: '100%',
		borderStyle: 'solid',
		borderWidth: 1,
		borderColor: '#e5e7eb',
		borderRadius: 4
	},
	tableHeader: {
		backgroundColor: '#f9fafb',
		flexDirection: 'row',
		borderBottomWidth: 1,
		borderBottomColor: '#e5e7eb'
	},
	tableHeaderCell: {
		padding: 12,
		fontSize: 12,
		fontWeight: 'bold',
		color: '#4b5563'
	},
	appHeader: {
		backgroundColor: '#f3f4f6',
		padding: 12,
		fontSize: 14,
		fontWeight: 'bold',
		color: '#111827'
	},
	tableRow: {
		flexDirection: 'row',
		borderBottomWidth: 1,
		borderBottomColor: '#e5e7eb'
	},
	tableCell: {
		padding: 12,
		fontSize: 12,
		color: '#374151'
	},
	projectCell: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 4
	},
	memberCell: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 4
	},
	progressBar: {
		width: '70%',
		height: 6,
		backgroundColor: '#e5e7eb',
		borderRadius: 3,
		marginRight: 8
	},
	progressFill: {
		height: '100%',
		backgroundColor: '#3b82f6',
		borderRadius: 3
	},
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
export function ProductivityApplicationPDF({ data, title }: ProductivityPDFProps) {
	const reportData = data as IActivityReportGroupByDate[];

	// Group activities by application
	const groupedByApp = reportData.reduce(
		(apps, dayData) => {
			dayData.employees.forEach((employeeData) => {
				employeeData.projects.forEach((projectData: IProjectWithActivity) => {
					projectData.activity.forEach((activity: IActivityItem) => {
						if (!apps[activity.title]) {
							apps[activity.title] = [];
						}
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
		{} as Record<string, Array<{ date: string; activity: IActivityItem; employee: any; projectName: string }>>
	);
	const today = new Date().toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});

	return (
		<Document>
			<Page size="A4" style={styles.page}>
				<View style={styles.header}>
					<Text style={styles.title}>{title}</Text>
					<Text style={styles.subtitle}>Generated on {today}</Text>
				</View>
				<View style={styles.table}>
					{/* Table Header */}
					<View style={styles.tableHeader}>
						<View style={[styles.tableHeaderCell, styles.col1]}>
							<Text>Date</Text>
						</View>
						<View style={[styles.tableHeaderCell, styles.col2]}>
							<Text>Project</Text>
						</View>
						<View style={[styles.tableHeaderCell, styles.col3]}>
							<Text>Member</Text>
						</View>
						<View style={[styles.tableHeaderCell, styles.col4]}>
							<Text>Time Spent</Text>
						</View>
						<View style={[styles.tableHeaderCell, styles.col5]}>
							<Text>Percent Used</Text>
						</View>
					</View>

					{/* Table Body */}
					{Object.entries(groupedByApp).map(([appName, activities]) => (
						<View key={appName}>
							{/* Application Header */}
							<View style={styles.appHeader}>
								<Text>{appName}</Text>
							</View>

							{/* Application Activities */}
							{activities.map(({ date, activity, employee, projectName }, index) => (
								<View key={`${appName}-${date}-${index}`} style={styles.tableRow}>
									<View style={[styles.tableCell, styles.col1]}>
										<Text>{format(new Date(date), 'EEEE dd MMM yyyy')}</Text>
									</View>
									<View style={[styles.tableCell, styles.col2]}>
										<View style={styles.projectCell}>
											<Text>{projectName}</Text>
										</View>
									</View>
									<View style={[styles.tableCell, styles.col3]}>
										<View style={styles.memberCell}>
											<Text>{employee.fullName}</Text>
										</View>
									</View>
									<View style={[styles.tableCell, styles.col4]}>
										<Text>{formatDuration(activity.duration.toString())}</Text>
									</View>
									<View style={[styles.tableCell, styles.col5]}>
										<View style={styles.progressBar}>
											<View
												style={[
													styles.progressFill,
													{
														width: `${activity.duration_percentage}%`
													}
												]}
											/>
										</View>
										<Text>{Math.round(parseFloat(activity.duration_percentage))}%</Text>
									</View>
								</View>
							))}
						</View>
					))}
				</View>
			</Page>
		</Document>
	);
}
