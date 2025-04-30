/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Keyboard } from 'react-native';
import { translate } from '../../../../i18n';
import { typography, useAppTheme } from '../../../../theme';

import { ITaskVersionCreate, ITaskVersionItemList } from '../../../../services/interfaces/ITaskVersion';

const TaskVersionForm = ({
	isEdit,
	onDismiss,
	item,
	onCreateVersion,
	onUpdateVersion,
	createVersionModal
}: {
	isEdit: boolean;
	onDismiss: () => unknown;
	item?: ITaskVersionItemList;
	onUpdateVersion: (id: string, data: ITaskVersionCreate) => unknown;
	onCreateVersion: (data: ITaskVersionCreate) => unknown;
	createVersionModal?: boolean;
}) => {
	const { colors, dark } = useAppTheme();
	const [versionName, setVersionName] = useState<string>(null);

	useEffect(() => {
		if (isEdit) {
			setVersionName(item.name);
		} else {
			setVersionName(null);
		}
	}, [item, isEdit]);

	const handleSubmit = async () => {
		if (versionName.trim().length <= 0) {
			return;
		}

		if (isEdit) {
			await onUpdateVersion(item?.id, {
				name: versionName
			});
		} else {
			await onCreateVersion({
				name: versionName,
				color: '#FFFFFF'
			});
		}

		setVersionName(null);
		onDismiss();
	};

	return (
		<View
			style={{
				backgroundColor: colors.background,
				paddingHorizontal: 25,
				paddingTop: 26,
				paddingBottom: 40,
				height: 452
			}}
		>
			<Text style={{ ...styles.formTitle, color: colors.primary }}>
				{translate('settingScreen.versionScreen.createNewVersionText')}
			</Text>
			<TextInput
				style={{ ...styles.versionNameInput, color: colors.primary }}
				placeholderTextColor={'#7B8089'}
				placeholder={translate('settingScreen.versionScreen.versionNamePlaceholder')}
				defaultValue={versionName}
				onChangeText={(text) => setVersionName(text)}
			/>

			<View style={{ ...styles.wrapButtons, marginTop: createVersionModal ? 20 : 40 }}>
				<TouchableOpacity
					style={styles.cancelBtn}
					onPress={() => {
						onDismiss();
						Keyboard.dismiss();
					}}
				>
					<Text style={styles.cancelTxt}>{translate('settingScreen.versionScreen.cancelButtonText')}</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={{
						...styles.createBtn,
						backgroundColor: dark ? '#6755C9' : '#3826A6',
						opacity: !versionName ? 0.2 : 1
					}}
					onPress={() => {
						if (versionName) {
							handleSubmit().finally(() => Keyboard.dismiss());
						}
					}}
				>
					<Text style={styles.createTxt}>
						{isEdit
							? translate('settingScreen.versionScreen.updateButtonText')
							: translate('settingScreen.versionScreen.createButtonText')}
					</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
};

export default TaskVersionForm;

const styles = StyleSheet.create({
	cancelBtn: {
		alignItems: 'center',
		backgroundColor: '#E6E6E9',
		borderRadius: 12,
		height: 57,
		justifyContent: 'center',
		width: '48%'
	},
	cancelTxt: {
		color: '#1A1C1E',
		fontFamily: typography.primary.semiBold,
		fontSize: 18
	},
	createBtn: {
		alignItems: 'center',
		backgroundColor: '#3826A6',
		borderRadius: 12,
		height: 57,
		justifyContent: 'center',
		width: '48%'
	},
	createTxt: {
		color: '#FFF',
		fontFamily: typography.primary.semiBold,
		fontSize: 18
	},
	formTitle: {
		color: '#1A1C1E',
		fontFamily: typography.primary.semiBold,
		fontSize: 24
	},
	versionNameInput: {
		alignItems: 'center',
		borderColor: '#DCE4E8',
		borderRadius: 12,
		borderWidth: 1,
		height: 57,
		marginTop: 16,
		paddingHorizontal: 18,
		width: '100%'
	},
	wrapButtons: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		width: '100%'
	}
});
