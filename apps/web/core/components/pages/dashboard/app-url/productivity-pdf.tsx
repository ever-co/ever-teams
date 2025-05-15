import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import {
	IActivityReportGroupByDate,
	IEmployeeWithProjects,
	IProjectWithActivity
} from '@/core/types/interfaces/activity/IActivityReport';

// Create styles

const styles = StyleSheet.create({
	page: { flexDirection: 'column', backgroundColor: '#FFFFFF', padding: '20px 30px', fontFamily: 'Helvetica' },
	header: { marginBottom: 20, borderBottom: '2 solid #E5E7EB', paddingBottom: 10 },
	titleSection: { marginBottom: 8, alignItems: 'center' },
	title: { fontSize: 24, fontWeight: 'bold', color: '#111827', textAlign: 'center', marginBottom: 4 },
	dateRange: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 5 },
	subtitle: { fontSize: 12, color: '#6B7280', textAlign: 'center', marginTop: 5 },
	dateHeader: { backgroundColor: '#F3F4F6', padding: 12, marginTop: 15, marginBottom: 8, borderRadius: 6 },
	dateText: { fontSize: 14, color: '#374151' },
	tableHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F3F4F6',
		padding: '10px 20px',
		marginTop: 10,
		borderBottomWidth: 2,
		borderBottomColor: '#E5E7EB'
	},
	headerCell: { fontSize: 12, fontWeight: 'bold', color: '#111827' },
	memberRow: {
		flexDirection: 'row',
		alignItems: 'center',
		borderBottomWidth: 1,
		borderBottomColor: '#E5E7EB',
		borderLeftWidth: 1,
		borderLeftColor: '#E5E7EB',
		borderRightWidth: 1,
		borderRightColor: '#E5E7EB',
		padding: '8px 20px',
		backgroundColor: '#FFFFFF'
	},
	memberInfo: {
		width: '20%',
		flexDirection: 'row',
		alignItems: 'center',
		fontSize: 12,
		color: '#374151',
		borderRightWidth: 1,
		borderRightColor: '#E5E7EB',
		paddingRight: 8
	},
	projectCell: {
		width: '25%',
		flexDirection: 'row',
		alignItems: 'center',
		fontSize: 12,
		color: '#374151',
		borderRightWidth: 1,
		borderRightColor: '#E5E7EB',
		paddingLeft: 8,
		paddingRight: 8
	},
	durationCell: { width: '15%', textAlign: 'right', color: '#374151', fontSize: 12 },
	percentageCell: { width: '15%', flexDirection: 'column', alignItems: 'flex-end' },
	percentageText: { fontSize: 12, color: '#374151', marginBottom: 4 },
	progressBar: { width: '100%', height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' },
	progressFill: { height: '100%', backgroundColor: '#10B981', borderRadius: 3 },
	timeCell: {
		width: '15%',
		textAlign: 'right',
		color: '#374151',
		fontSize: 12,
		borderRightWidth: 1,
		borderRightColor: '#E5E7EB',
		paddingLeft: 8,
		paddingRight: 8
	},
	appCell: {
		width: '25%',
		color: '#374151',
		fontSize: 12,
		borderRightWidth: 1,
		borderRightColor: '#E5E7EB',
		paddingLeft: 8,
		paddingRight: 8
	},
	contentWrapper: { flex: 1, width: '100%' },
	summarySection: {
		marginTop: 40,
		backgroundColor: '#F9FAFB',
		padding: '25px',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#E5E7EB'
	},
	summaryTitle: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#111827',
		marginBottom: 20,
		textAlign: 'center',
		textTransform: 'uppercase',
		letterSpacing: 1
	},
	summaryGroup: { marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingBottom: 15 },
	summaryGroupTitle: { fontSize: 13, fontWeight: 'bold', color: '#4B5563', marginBottom: 12 },
	summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, paddingLeft: 10 },
	summaryLabel: { fontSize: 12, color: '#374151', width: '60%' },
	summaryValue: { fontSize: 12, fontWeight: 'bold', color: '#111827', width: '40%', textAlign: 'right' },
	highlightValue: { color: '#059669' }
});

interface ProductivityPDFProps {
	data: IActivityReportGroupByDate[];
	title?: string;
	startDate?: string;
	endDate?: string;
}

const getEmployeeName = (employee: IEmployeeWithProjects) => {
	const { fullName } = employee.employee || {};
	return fullName || 'Unknown';
};

const getProjectName = (project: IProjectWithActivity) => {
	return project?.project?.name || 'No Project';
};

const formatDateHeader = (date: string) => {
	try {
		const d = new Date(date);
		if (isNaN(d.getTime())) {
			return 'Invalid Date';
		}
		return `${d.toLocaleDateString('en-US', { weekday: 'long' })} ${d.getDate().toString().padStart(2, '0')} ${d.toLocaleDateString('en-US', { month: 'short' })} ${d.getFullYear()}`;
	} catch (error) {
		console.error('Error formatting date:', error);
		return 'Invalid Date';
	}
};

const TableHeader = () => (
	<View style={styles.tableHeader}>
		<View style={[styles.memberInfo, styles.headerCell]}>
			<Text>Employee</Text>
		</View>
		<View style={[styles.projectCell, styles.headerCell]}>
			<Text>Project</Text>
		</View>
		<View style={[styles.appCell, styles.headerCell]}>
			<Text>Activity</Text>
		</View>
		<View style={[styles.timeCell, styles.headerCell]}>
			<Text>Duration</Text>
		</View>
		<View style={[styles.percentageCell, styles.headerCell]}>
			<Text>Progress</Text>
		</View>
	</View>
);

const ActivityRow = ({
	employeeName,
	projectName,
	activityTitle,
	duration,
	durationPercentage
}: {
	employeeName: string;
	projectName: string;
	activityTitle: string;
	duration: string;
	durationPercentage: string;
}) => (
	<View style={styles.memberRow}>
		<View style={styles.memberInfo}>
			<Text>{employeeName}</Text>
		</View>
		<View style={styles.projectCell}>
			<Text>{projectName}</Text>
		</View>
		<View style={styles.appCell}>
			<Text>{activityTitle}</Text>
		</View>
		<View style={styles.timeCell}>
			<Text>{duration}</Text>
		</View>
		<View style={styles.percentageCell}>
			<Text style={styles.percentageText}>{parseFloat(durationPercentage).toFixed(1)}%</Text>
			<View style={styles.progressBar}>
				<View style={[styles.progressFill, { width: `${Math.min(parseFloat(durationPercentage), 100)}%` }]} />
			</View>
		</View>
	</View>
);

const SummaryRow = ({
	label,
	value,
	highlight = false
}: {
	label: string;
	value: string | number;
	highlight?: boolean;
}) => (
	<View style={styles.summaryRow}>
		<Text style={styles.summaryLabel}>{label}</Text>
		<Text style={highlight ? [styles.summaryValue, styles.highlightValue] : styles.summaryValue}>{value}</Text>
	</View>
);

const SummaryGroup = ({ title, children }: { title: string; children: React.ReactNode }) => (
	<View style={styles.summaryGroup}>
		<Text style={styles.summaryGroupTitle}>{title}</Text>
		{children}
	</View>
);

export const ProductivityPDF = ({ data, title = 'Activity Report', startDate, endDate }: ProductivityPDFProps) => {
	// Calculate summary statistics
	const calculateSummary = (data: IActivityReportGroupByDate[]) => {
		let totalDuration = 0;
		let totalActivities = 0;
		const employeeStats = new Map<string, { duration: number; activities: number }>();
		const projectStats = new Map<string, { duration: number; activities: number }>();

		data.forEach((dayData) => {
			dayData.employees.forEach((employee) => {
				const employeeName = getEmployeeName(employee);
				if (!employeeStats.has(employeeName)) {
					employeeStats.set(employeeName, { duration: 0, activities: 0 });
				}

				employee.projects.forEach((project) => {
					const projectName = getProjectName(project);
					if (!projectStats.has(projectName)) {
						projectStats.set(projectName, { duration: 0, activities: 0 });
					}

					project.activity.forEach((activity) => {
						const duration = parseFloat(activity.duration?.toString() || '0');
						totalDuration += duration;
						totalActivities++;

						const empStats = employeeStats.get(employeeName);
						if (empStats) {
							empStats.duration += duration;
							empStats.activities++;
						}

						const projStats = projectStats.get(projectName);
						if (projStats) {
							projStats.duration += duration;
							projStats.activities++;
						}
					});
				});
			});
		});

		// Find most active employee and project
		let mostActiveEmployee = { name: '', duration: 0 };
		let mostActiveProject = { name: '', duration: 0 };

		employeeStats.forEach((stats, name) => {
			if (stats.duration > mostActiveEmployee.duration) {
				mostActiveEmployee = { name, duration: stats.duration };
			}
		});

		projectStats.forEach((stats, name) => {
			if (stats.duration > mostActiveProject.duration) {
				mostActiveProject = { name, duration: stats.duration };
			}
		});

		return {
			totalDuration,
			totalActivities,
			averageDuration: totalActivities > 0 ? totalDuration / totalActivities : 0,
			mostActiveEmployee,
			mostActiveProject,
			uniqueEmployees: employeeStats.size,
			uniqueProjects: projectStats.size
		};
	};

	const summary = calculateSummary(data);

	const formatDuration = (duration: string | number) => {
		if (!duration) return '0h 0m';
		const minutes = typeof duration === 'string' ? parseInt(duration, 10) : duration;
		const hours = Math.floor(minutes / 60);
		const remainingMinutes = minutes % 60;
		return `${hours}h ${remainingMinutes.toString().padStart(2, '0')}m`;
	};

	return (
		<Document>
			<Page size="A4" orientation="landscape" style={styles.page}>
				<View style={styles.header}>
					<View style={styles.titleSection}>
						<Text style={styles.title}>{title}</Text>
						{(startDate || endDate) && (
							<Text style={styles.dateRange}>
								{startDate && `From ${startDate}`}
								{startDate && endDate && ' • '}
								{endDate && `To ${endDate}`}
							</Text>
						)}
					</View>
				</View>
				<View style={styles.contentWrapper}>
					{data.map((dayData, index) => (
						<React.Fragment key={index}>
							{/* Date Header */}
							<View style={styles.dateHeader}>
								<Text style={styles.dateText}>{formatDateHeader(dayData.date)}</Text>
							</View>

							{/* Table Header */}
							<TableHeader />

							{/* Activities for the day */}
							{dayData.employees.map((employee, empIndex) =>
								employee.projects.flatMap((project, projIndex) =>
									project.activity.map((activity, actIndex) => (
										<ActivityRow
											key={`${index}-${empIndex}-${projIndex}-${actIndex}`}
											employeeName={getEmployeeName(employee)}
											projectName={getProjectName(project)}
											activityTitle={activity.title}
											duration={formatDuration(activity.duration)}
											durationPercentage={activity.duration_percentage?.toString() || '0'}
										/>
									))
								)
							)}
						</React.Fragment>
					))}
					{/* Summary Section */}
					<View style={styles.summarySection}>
						<Text style={styles.summaryTitle}>Performance Summary</Text>

						{/* Time Statistics */}
						<SummaryGroup title="Time Overview">
							<SummaryRow
								label="Total Working Hours:"
								value={formatDuration(summary.totalDuration)}
								highlight={true}
							/>
							<SummaryRow
								label="Average Time per Activity:"
								value={formatDuration(summary.averageDuration)}
							/>
						</SummaryGroup>

						{/* Activity Statistics */}
						<SummaryGroup title="Activity Metrics">
							<SummaryRow
								label="Total Activities Completed:"
								value={summary.totalActivities}
								highlight={true}
							/>
							<SummaryRow label="Active Projects:" value={summary.uniqueProjects} />
						</SummaryGroup>

						{/* Team Performance */}
						<SummaryGroup title="Team Performance">
							<SummaryRow label="Team Size:" value={`${summary.uniqueEmployees} members`} />
							<SummaryRow
								label="Top Performer:"
								value={summary.mostActiveEmployee.name}
								highlight={true}
							/>
							<SummaryRow
								label="Most Active Project:"
								value={summary.mostActiveProject.name}
								highlight={true}
							/>
						</SummaryGroup>
					</View>
				</View>
			</Page>
		</Document>
	);
};
