'use client';

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { DottedLanguageObjectStringPaths } from 'next-intl';

const styles = StyleSheet.create({
	page: { padding: 20 },
	table: { display: 'flex', flexDirection: 'column', width: '100%', fontWeight: '400', fontSize: '10px' },
	row: { flexDirection: 'row' },
	cell: { borderWidth: 0.25, padding: 2, paddingLeft: 4 },
	headerRow: { backgroundColor: '#6755C9', fontWeight: 'bold', color: 'white' },
	headerCell: { paddingVertical: 4 },
	projectCells: { width: '20%' },
	statusCells: { width: '9%' },
	startDateCells: { width: '10%' },
	endDateCells: { width: '10%' },
	membersCells: { width: '17%' },
	managersCells: { width: '17%' },
	teamsCells: { width: '17%' },
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

export const PDFDocument = ({ data, headers, title }: { data: RowDataType[], headers : Record<keyof RowDataType, DottedLanguageObjectStringPaths>, title : string }) => {

	const Row = (row: RowDataType) => (
		<View style={styles.row}>
			<Text style={[styles.cell, styles.projectCells]}>{row.projectName}</Text>
			<Text style={[styles.cell, styles.statusCells]}>{row.status}</Text>
			<Text style={[styles.cell, styles.startDateCells]}>{row.startDate}</Text>
			<Text style={[styles.cell, styles.endDateCells]}>{row.endDate}</Text>
			<Text style={[styles.cell, styles.membersCells]}>{row.members.join(', ')}</Text>
			<Text style={[styles.cell, styles.managersCells]}>{row.managers.join(', ')}</Text>
			<Text style={[styles.cell, styles.teamsCells]}>{row.teams.join(', ')}</Text>
		</View>
	);

	return (
		<Document style={{ width: '100%', height: '40rem' }}>
			<Page size="A4" orientation="landscape" style={styles.page}>
				{/**
				 * Title
				 */}
				<View style={{width : '100%', marginBottom : '20px'}}>
						<Text style={{ fontSize : '12px', color :'#6755C9' }}>{title}</Text>
				</View>
				<View style={styles.table}>
					{/**
					 * Header
					 */}
					<View key={0} style={[styles.headerRow, styles.row]}>
						<Text style={[styles.cell, styles.headerCell, styles.projectCells]}>{headers.projectName}</Text>
						<Text style={[styles.cell, styles.headerCell, styles.statusCells]}>{headers.status}</Text>
						<Text style={[styles.cell, styles.headerCell, styles.endDateCells]}>{headers.startDate}</Text>
						<Text style={[styles.cell, styles.headerCell, styles.startDateCells]}>{headers.endDate}</Text>
						<Text style={[styles.cell, styles.headerCell, styles.membersCells]}>{headers.members}</Text>
						<Text style={[styles.cell, styles.headerCell, styles.managersCells]}>{headers.managers}</Text>
						<Text style={[styles.cell, styles.headerCell, styles.teamsCells]}>{headers.teams}</Text>
					</View>
					{/**
					 * Body
					 */}
					{data.map((el, i) => (
						<Row {...el} key={i} />
					))}
				</View>
			</Page>
		</Document>
	);
};
