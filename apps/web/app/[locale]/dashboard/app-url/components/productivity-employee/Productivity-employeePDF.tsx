import React from 'react';
import { format } from 'date-fns';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { IActivityItem, IEmployee } from './ProductivityEmployeeTable';

interface IEmployeeGroup {
	employee: IEmployee;
	dates: Array<{
		date: string;
		projects: Array<{
			activity: IActivityItem[];
		}>;
	}>;
}

Font.register({
	family: 'Helvetica',
	src: 'https://fonts.gstatic.com/s/helveticaneue/v70/1Ptsg8zYS_SKggPNyC0IT0kLW-43aMEzIO6XUTLjad8.ttf'
});

const styles = StyleSheet.create({
	page: {
		flexDirection: 'column',
		backgroundColor: '#FFFFFF',
		padding: 30,
		fontFamily: 'Helvetica'
	},
	header: {
		marginBottom: 20,
		paddingBottom: 10,
		borderBottom: '1px solid #EEEEEE'
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		color: '#1A1A1A',
		marginBottom: 5
	},
	subtitle: {
		fontSize: 12,
		color: '#666666'
	},
	table: {
		width: '100%',
		borderRadius: 8,
		overflow: 'hidden'
	},
	tableHeader: {
		flexDirection: 'row',
		backgroundColor: '#F9FAFB',
		padding: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#EEEEEE',
		borderBottomStyle: 'solid'
	},
	tableHeaderCell: {
		fontSize: 12,
		fontWeight: 'bold',
		color: '#374151'
	},
	tableRow: {
		flexDirection: 'row',
		padding: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#EEEEEE',
		borderBottomStyle: 'solid'
	},
	tableCell: {
		fontSize: 11,
		color: '#4B5563'
	},
	employeeHeader: {
		backgroundColor: '#F3F4F6',
		padding: 12,
		marginTop: 16,
		borderRadius: 4
	},
	employeeName: {
		fontSize: 14,
		fontWeight: 'bold',
		color: '#1F2937'
	},
	col1: { width: '25%' },
	col2: { width: '25%' },
	col3: { width: '25%' },
	col4: { width: '25%' },
	projectCell: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 4
	},
	percentageBar: {
		width: '70%',
		height: 4,
		backgroundColor: '#E5E7EB',
		borderRadius: 2,
		overflow: 'hidden'
	},
	percentageFill: {
		height: '100%',
		backgroundColor: '#422AFB'
	},
	percentageText: {
		marginLeft: 8,
		fontSize: 10
	}
});

interface ProductivityPDFProps {
	data: IEmployeeGroup[];
	title?: string;
}


export function ProductivityEmployeePDF({ data = [], title = 'Productivity Report' }: ProductivityPDFProps) {
	const today = format(new Date(), 'EEEE dd MMM yyyy');

	// Validate data structure
	if (!Array.isArray(data) || !data.length) {
		console.error('Data is not a valid array:', data);
		return null;
	}

	return (
		<Document>
			<Page size="A4" style={styles.page}>
				<View style={styles.header}>
					<Text style={styles.title}>{title}</Text>
					<Text style={styles.subtitle}>Generated on {today}</Text>
				</View>

				{data.map((employeeGroup, index) => (
					<View key={index}>
						<View style={styles.employeeHeader}>
							<Text style={styles.employeeName}>
								{employeeGroup.employee.user.firstName} {employeeGroup.employee.user.lastName}
							</Text>
						</View>

						<View style={styles.table}>
							<View style={styles.tableHeader}>
								<Text style={[styles.tableHeaderCell, styles.col1]}>Date</Text>
								<Text style={[styles.tableHeaderCell, styles.col2]}>Project</Text>
								<Text style={[styles.tableHeaderCell, styles.col3]}>Activity</Text>
								<Text style={[styles.tableHeaderCell, styles.col4]}>Duration</Text>
							</View>

							{employeeGroup.dates.map((dateGroup, dateIndex) => (
								dateGroup.projects.map((project, projectIndex) => (
									project.activity.map((activity, activityIndex) => (
										<View
											key={`${dateIndex}-${projectIndex}-${activityIndex}`}
											style={styles.tableRow}
										>
											<Text style={[styles.tableCell, styles.col1]}>
												{format(new Date(dateGroup.date), 'dd MMM yyyy')}
											</Text>
											<Text style={[styles.tableCell, styles.col2]}>
												{activity.projectName || 'N/A'}
											</Text>
											<Text style={[styles.tableCell, styles.col3]}>
												{activity.title}
											</Text>
											<View style={[styles.projectCell, styles.col4]}>
												<View style={styles.percentageBar}>
													<View
														style={[styles.percentageFill, { width: `${activity.duration}%` }]}
													/>
												</View>
												<Text style={styles.percentageText}>
													{activity.duration}%
												</Text>
											</View>
										</View>
									))
								))
							))}
						</View>
					</View>
				))}
			</Page>
		</Document>
	);
}
