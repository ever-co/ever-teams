'use client';

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { DottedLanguageObjectStringPaths } from 'next-intl';

const styles = StyleSheet.create({
	page: { padding: 20 },
	table: { display: 'flex', flexDirection: 'column', width: '100%', fontSize: 10 },
	row: { flexDirection: 'row' },
	cell: { borderWidth: 0.25, padding: 2, paddingLeft: 4 },
	headerRow: { backgroundColor: '#6755C9', fontWeight: 'bold', color: 'white' },
	headerCell: { paddingVertical: 4 },
	title: { fontSize: 12, color: '#6755C9', marginBottom: 20 },
	titleContainer: { width: '100%', marginBottom: 20 },
	projectCells: { width: '20%' },
	statusCells: { width: '9%' },
	dateCells: { width: '10%' },
	membersCells: { width: '17%' },
	managersCells: { width: '17%' },
	teamsCells: { width: '17%' }
});

type RowDataType = {
	projectName: string;
	status: string;
	archivedAt: string | null;
	startDate: string;
	endDate: string;
	members: string[];
	managers: string[];
	teams: string[];
};

// Row component moved outside to avoid re-creation
const Row = ({ row }: { row: RowDataType }) => (
	<View style={styles.row}>
		<Text style={[styles.cell, styles.projectCells]}>{row.projectName}</Text>
		<Text style={[styles.cell, styles.statusCells]}>{row.status}</Text>
		<Text style={[styles.cell, styles.dateCells]}>{row.startDate}</Text>
		<Text style={[styles.cell, styles.dateCells]}>{row.endDate}</Text>
		<Text style={[styles.cell, styles.membersCells]}>{row.members.join(', ')}</Text>
		<Text style={[styles.cell, styles.managersCells]}>{row.managers.join(', ')}</Text>
		<Text style={[styles.cell, styles.teamsCells]}>{row.teams.join(', ')}</Text>
	</View>
);

export const PDFDocument = ({
	data,
	headers,
	title
}: {
	data: RowDataType[];
	headers: Record<keyof RowDataType, DottedLanguageObjectStringPaths>;
	title: string;
}) => {
	// Validate and sanitize data to prevent PDF generation errors
	const sanitizedData = (data || []).map((item) => ({
		projectName: item.projectName || '-',
		status: item.status || '-',
		archivedAt: item.archivedAt || '-',
		startDate: item.startDate || '-',
		endDate: item.endDate || '-',
		members: Array.isArray(item.members) ? item.members : [],
		managers: Array.isArray(item.managers) ? item.managers : [],
		teams: Array.isArray(item.teams) ? item.teams : []
	}));

	const sanitizedTitle = title || 'Projects Report';

	return (
		<Document>
			<Page size="A4" orientation="landscape" style={styles.page}>
				{/**
				 * Title
				 */}
				<View style={styles.titleContainer}>
					<Text style={styles.title}>{sanitizedTitle}</Text>
				</View>
				<View style={styles.table}>
					{/**
					 * Header
					 */}
					<View style={[styles.headerRow, styles.row]}>
						<Text style={[styles.cell, styles.headerCell, styles.projectCells]}>{headers.projectName}</Text>
						<Text style={[styles.cell, styles.headerCell, styles.statusCells]}>{headers.status}</Text>
						<Text style={[styles.cell, styles.headerCell, styles.dateCells]}>{headers.startDate}</Text>
						<Text style={[styles.cell, styles.headerCell, styles.dateCells]}>{headers.endDate}</Text>
						<Text style={[styles.cell, styles.headerCell, styles.membersCells]}>{headers.members}</Text>
						<Text style={[styles.cell, styles.headerCell, styles.managersCells]}>{headers.managers}</Text>
						<Text style={[styles.cell, styles.headerCell, styles.teamsCells]}>{headers.teams}</Text>
					</View>
					{/**
					 * Body
					 */}
					{sanitizedData.map((el, i) => (
						<Row key={i} row={el} />
					))}
				</View>
			</Page>
		</Document>
	);
};
