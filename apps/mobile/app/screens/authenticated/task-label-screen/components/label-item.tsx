/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import { typography, useAppTheme } from '../../../../theme';
import { ITaskLabelItem } from '../../../../services/interfaces/ITaskLabel';
import { SvgUri } from 'react-native-svg';

interface ILabelItem {
	label: ITaskLabelItem;
	onDeleteLabel: () => unknown;
	openForEdit: () => unknown;
}

const StatusItem: FC<ILabelItem> = ({ label, onDeleteLabel, openForEdit }) => {
	const { colors, dark } = useAppTheme();
	return (
		<View
			style={{
				...styles.container,
				backgroundColor: dark ? '#181C24' : colors.background,
				borderColor: 'rgba(0,0,0,0.13)'
			}}
		>
			<View style={{ ...styles.statusContainer, backgroundColor: label?.color }}>
				<SvgUri width={20} height={20} uri={label?.fullIconUrl} />
				<Text style={styles.text}>{label?.name}</Text>
			</View>
			<View style={styles.rightSection}>
				<AntDesign size={16} name={'edit'} color={colors.primary} onPress={() => openForEdit()} />
				<Ionicons name="trash-outline" size={16} color={'#DE5536'} onPress={() => onDeleteLabel()} />
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		alignItems: 'center',
		borderRadius: 10,
		borderWidth: 1,
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 16,
		padding: 6,
		paddingRight: 16,
		width: '100%'
	},
	rightSection: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		width: '16%'
	},
	statusContainer: {
		alignItems: 'center',
		backgroundColor: '#D4EFDF',
		borderRadius: 10,
		flexDirection: 'row',
		height: '100%',
		paddingHorizontal: 16,
		paddingVertical: 12,
		width: '60%'
	},
	text: {
		fontFamily: typography.primary.medium,
		fontSize: 14,
		marginLeft: 13.5
	}
});

export default StatusItem;
