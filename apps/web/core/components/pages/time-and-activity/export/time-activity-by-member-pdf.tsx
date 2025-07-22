import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Use default fonts to avoid loading issues

const styles = StyleSheet.create({
	page: {
		flexDirection: 'column',
		backgroundColor: '#FFFFFF',
		padding: 30,
		fontFamily: 'Helvetica'
	},
	header: {
		marginBottom: 20,
		borderBottom: 2,
		borderBottomColor: '#E5E7EB',
		paddingBottom: 15
	},
	title: {
		fontSize: 24,
		fontWeight: 600,
		color: '#111827',
		marginBottom: 8
	},
	subtitle: {
		fontSize: 14,
		color: '#6B7280',
		marginBottom: 4
	},
	memberSection: {
		marginBottom: 25,
		padding: 15,
		backgroundColor: '#F8FAFC',
		borderRadius: 8,
		borderLeft: 4,
		borderLeftColor: '#3B82F6'
	},
	memberName: {
		fontSize: 16,
		fontWeight: 600,
		color: '#1E40AF',
		marginBottom: 8
	},
	memberStats: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 15,
		padding: 10,
		backgroundColor: '#EFF6FF',
		borderRadius: 6
	},
	statItem: {
		alignItems: 'center'
	},
	statValue: {
		fontSize: 14,
		fontWeight: 600,
		color: '#1E40AF',
		marginBottom: 2
	},
	statLabel: {
		fontSize: 9,
		color: '#6B7280'
	},
	projectSection: {
		marginBottom: 15,
		marginLeft: 10
	},
	projectName: {
		fontSize: 12,
		fontWeight: 600,
		color: '#374151',
		marginBottom: 8,
		paddingLeft: 8,
		borderLeft: 2,
		borderLeftColor: '#10B981'
	},
	taskRow: {
		flexDirection: 'row',
		padding: 6,
		marginBottom: 3,
		backgroundColor: '#FFFFFF',
		borderRadius: 4,
		borderLeft: 1,
		borderLeftColor: '#E5E7EB'
	},
	taskName: {
		fontSize: 10,
		color: '#374151',
		flex: 2,
		marginRight: 10
	},
	taskHours: {
		fontSize: 10,
		color: '#6B7280',
		flex: 1,
		textAlign: 'right'
	},
	taskEarnings: {
		fontSize: 10,
		color: '#059669',
		flex: 1,
		textAlign: 'right'
	},
	taskActivity: {
		fontSize: 10,
		color: '#DC2626',
		flex: 1,
		textAlign: 'right'
	},
	noDataText: {
		fontSize: 12,
		color: '#9CA3AF',
		textAlign: 'center',
		marginTop: 50,
		fontStyle: 'italic'
	},
	footer: {
		position: 'absolute',
		bottom: 30,
		left: 30,
		right: 30,
		textAlign: 'center',
		color: '#9CA3AF',
		fontSize: 8,
		borderTop: 1,
		borderTopColor: '#E5E7EB',
		paddingTop: 10
	}
});
interface GroupedMemberData {
	name: string;
	projects: Record<
		string,
		{
			name: string;
			tasks: Array<{
				title: string;
				hours: string;
				earnings: string;
				activityLevel: string;
				date: string;
			}>;
			totalHours: number;
			totalEarnings: number;
		}
	>;
	totalHours: number;
	totalEarnings: number;
	totalTasks: number;
}
export interface TimeActivityByMemberPDFProps {
	data: Array<{
		date: string;
		member: string;
		project: string;
		task: string;
		trackedHours: string;
		earnings: string;
		activityLevel: string;
	}>;
	title: string;
	startDate: string;
	endDate: string;
}

export function TimeActivityByMemberPDF({ data, title, startDate, endDate }: TimeActivityByMemberPDFProps) {
	// Group transformed data by member
	const memberData = React.useMemo(() => {
		// If data is already transformed, group it by member
		if (!data || !Array.isArray(data) || data.length === 0) {
			return [];
		}

		const grouped: { [key: string]: GroupedMemberData } = {};

		data.forEach((item) => {
			const memberName = item.member || 'Unknown Member';
			const memberId = memberName; // Use name as ID since we don't have employee ID in transformed data

			if (!grouped[memberId]) {
				grouped[memberId] = {
					name: memberName,
					projects: {},
					totalHours: 0,
					totalEarnings: 0,
					totalTasks: 0
				};
			}

			const projectName = item.project || 'No Project';
			const projectId = projectName;

			if (!grouped[memberId].projects[projectId]) {
				grouped[memberId].projects[projectId] = {
					name: projectName,
					tasks: [],
					totalHours: 0,
					totalEarnings: 0
				};
			}

			// Parse hours from trackedHours string (e.g., "1h 15m", "2h", "30m")
			const parseHours = (timeStr: string): number => {
				if (!timeStr) return 0;
				const hoursMatch = timeStr.match(/(\d+)h/);
				const minutesMatch = timeStr.match(/(\d+)m/);
				const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
				const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;
				return hours + minutes / 60;
			};
			const hours = parseHours(item.trackedHours);

			// Parse earnings from string (e.g., "$0.00")
			const parseEarnings = (earningsStr: string): number => {
				if (!earningsStr) return 0;
				const numStr = earningsStr.replace(/[^\d.-]/g, '');
				return parseFloat(numStr) || 0;
			};
			const earnings = parseEarnings(item.earnings);

			grouped[memberId].projects[projectId].tasks.push({
				title: item.task || 'No Task',
				hours: hours.toString(),
				earnings: earnings.toString(),
				activityLevel: item.activityLevel || '0%',
				date: item.date
			});

			grouped[memberId].projects[projectId].totalHours += hours;
			grouped[memberId].projects[projectId].totalEarnings += earnings;
			grouped[memberId].totalHours += hours;
			grouped[memberId].totalEarnings += earnings;
			grouped[memberId].totalTasks += 1;
		});

		return Object.values(grouped);
	}, [data]);

	if (memberData.length === 0) {
		return (
			<Document>
				<Page size="A4" style={styles.page}>
					<View style={styles.header}>
						<Text style={styles.title}>{title}</Text>
						<Text style={styles.subtitle}>
							Report Period: {startDate} - {endDate}
						</Text>
					</View>
					<Text style={styles.noDataText}>No data available for the selected period and filters.</Text>
				</Page>
			</Document>
		);
	}

	const today = new Date().toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});
	return (
		<Document>
			<Page size="A4" style={styles.page}>
				{/* Header */}
				<View style={styles.header}>
					<Text style={styles.title}>{title}</Text>
					<Text style={styles.subtitle}>
						Report Period: {startDate} - {endDate}
					</Text>
					<Text style={styles.subtitle}>Generated on: {today}</Text>
				</View>

				{/* Member Sections */}
				{memberData.map((member, memberIndex) => (
					<View key={memberIndex} style={styles.memberSection}>
						<Text style={styles.memberName}>{member.name}</Text>

						{/* Member Statistics */}
						<View style={styles.memberStats}>
							<View style={styles.statItem}>
								<Text style={styles.statValue}>
									{Math.floor(member.totalHours)}h {Math.floor((member.totalHours % 1) * 60)}m
								</Text>
								<Text style={styles.statLabel}>Total Hours</Text>
							</View>
							<View style={styles.statItem}>
								<Text style={styles.statValue}>${member.totalEarnings.toFixed(2)}</Text>
								<Text style={styles.statLabel}>Total Earnings</Text>
							</View>
							<View style={styles.statItem}>
								<Text style={styles.statValue}>{member.totalTasks}</Text>
								<Text style={styles.statLabel}>Tasks Completed</Text>
							</View>
							<View style={styles.statItem}>
								<Text style={styles.statValue}>{Object.keys(member.projects).length}</Text>
								<Text style={styles.statLabel}>Projects</Text>
							</View>
						</View>

						{/* Projects */}
						{Object.values(member.projects).map((project, projectIndex) => (
							<View key={projectIndex} style={styles.projectSection}>
								<Text style={styles.projectName}>{project.name}</Text>

								{/* Tasks */}
								{project.tasks.slice(0, 10).map((task, taskIndex) => (
									<View key={taskIndex} style={styles.taskRow}>
										<Text style={styles.taskName}>{task.title}</Text>
										<Text style={styles.taskHours}>{task.hours}</Text>
										<Text style={styles.taskEarnings}>{task.earnings}</Text>
										<Text style={styles.taskActivity}>{task.activityLevel}</Text>
									</View>
								))}

								{project.tasks.length > 10 && (
									<Text style={[styles.taskName, { textAlign: 'center', fontStyle: 'italic' }]}>
										... and {project.tasks.length - 10} more tasks
									</Text>
								)}
							</View>
						))}
					</View>
				))}

				{/* Footer */}
				<Text style={styles.footer}>Ever Teams - Time & Activity Report by Member | Page 1 of 1</Text>
			</Page>
		</Document>
	);
}
