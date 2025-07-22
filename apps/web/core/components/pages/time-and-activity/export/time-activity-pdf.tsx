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
	filterSection: {
		marginBottom: 20,
		padding: 15,
		backgroundColor: '#F9FAFB',
		borderRadius: 8
	},
	filterTitle: {
		fontSize: 12,
		fontWeight: 600,
		color: '#374151',
		marginBottom: 8
	},
	filterText: {
		fontSize: 10,
		color: '#6B7280',
		marginBottom: 3
	},
	summarySection: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 20,
		padding: 15,
		backgroundColor: '#EFF6FF',
		borderRadius: 8
	},
	summaryItem: {
		alignItems: 'center'
	},
	summaryValue: {
		fontSize: 18,
		fontWeight: 600,
		color: '#1E40AF',
		marginBottom: 4
	},
	summaryLabel: {
		fontSize: 10,
		color: '#6B7280'
	},
	table: {
		marginTop: 10
	},
	tableHeader: {
		flexDirection: 'row',
		backgroundColor: '#F3F4F6',
		padding: 8,
		borderRadius: 4
	},
	tableHeaderCell: {
		fontSize: 10,
		fontWeight: 600,
		color: '#374151',
		flex: 1,
		textAlign: 'center'
	},
	tableRow: {
		flexDirection: 'row',
		padding: 8,
		borderBottom: 1,
		borderBottomColor: '#E5E7EB'
	},
	tableCell: {
		fontSize: 9,
		color: '#6B7280',
		flex: 1,
		textAlign: 'center'
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

export interface TimeActivityPDFProps {
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
	appliedFilters?: {
		teams?: string[];
		members?: string[];
		projects?: string[];
		tasks?: string[];
	};
	summary?: {
		totalHours: string;
		averageActivity: string;
		totalEarnings: string;
		totalRecords: number;
	};
}

export function TimeActivityPDF({ data, title, startDate, endDate, appliedFilters, summary }: TimeActivityPDFProps) {
	// Data is already transformed, just use it directly
	const transformedData = React.useMemo(() => {
		// Data should already be transformed to the format:
		// [{ date, member, project, task, trackedHours, earnings, activityLevel }]
		return data || [];
	}, [data]);

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

				{/* Applied Filters */}
				{appliedFilters && (
					<View style={styles.filterSection}>
						<Text style={styles.filterTitle}>Applied Filters</Text>
						{appliedFilters.teams && appliedFilters.teams.length > 0 && (
							<Text style={styles.filterText}>Teams: {appliedFilters.teams.join(', ')}</Text>
						)}
						{appliedFilters.members && appliedFilters.members.length > 0 && (
							<Text style={styles.filterText}>Members: {appliedFilters.members.join(', ')}</Text>
						)}
						{appliedFilters.projects && appliedFilters.projects.length > 0 && (
							<Text style={styles.filterText}>Projects: {appliedFilters.projects.join(', ')}</Text>
						)}
						{appliedFilters.tasks && appliedFilters.tasks.length > 0 && (
							<Text style={styles.filterText}>Tasks: {appliedFilters.tasks.join(', ')}</Text>
						)}
					</View>
				)}

				{/* Summary */}
				{summary && (
					<View style={styles.summarySection}>
						<View style={styles.summaryItem}>
							<Text style={styles.summaryValue}>{summary.totalHours}</Text>
							<Text style={styles.summaryLabel}>Total Hours</Text>
						</View>
						<View style={styles.summaryItem}>
							<Text style={styles.summaryValue}>{summary.averageActivity}</Text>
							<Text style={styles.summaryLabel}>Avg Activity</Text>
						</View>
						<View style={styles.summaryItem}>
							<Text style={styles.summaryValue}>{summary.totalEarnings}</Text>
							<Text style={styles.summaryLabel}>Total Earnings</Text>
						</View>
						<View style={styles.summaryItem}>
							<Text style={styles.summaryValue}>{summary.totalRecords}</Text>
							<Text style={styles.summaryLabel}>Records</Text>
						</View>
					</View>
				)}

				{/* Data Table */}
				<View style={styles.table}>
					{/* Table Header */}
					<View style={styles.tableHeader}>
						<Text style={styles.tableHeaderCell}>Date</Text>
						<Text style={styles.tableHeaderCell}>Member</Text>
						<Text style={styles.tableHeaderCell}>Project</Text>
						<Text style={styles.tableHeaderCell}>Task</Text>
						<Text style={styles.tableHeaderCell}>Hours</Text>
						<Text style={styles.tableHeaderCell}>Earnings</Text>
						<Text style={styles.tableHeaderCell}>Activity</Text>
					</View>

					{/* Table Rows */}
					{transformedData.map((row, index) => (
						<View key={index} style={styles.tableRow}>
							<Text style={styles.tableCell}>{row.date}</Text>
							<Text style={styles.tableCell}>{row.member}</Text>
							<Text style={styles.tableCell}>{row.project}</Text>
							<Text style={styles.tableCell}>{row.task}</Text>
							<Text style={styles.tableCell}>{row.trackedHours}</Text>
							<Text style={styles.tableCell}>{row.earnings}</Text>
							<Text style={styles.tableCell}>{row.activityLevel}</Text>
						</View>
					))}
				</View>

				{/* Footer */}
				<Text style={styles.footer}>Ever Teams - Time & Activity Report</Text>
			</Page>
		</Document>
	);
}
