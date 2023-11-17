/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC, useRef, useState } from 'react';
import {
	View,
	Text,
	ViewStyle,
	TouchableOpacity,
	StyleSheet,
	ActivityIndicator,
	FlatList,
	StatusBar
} from 'react-native';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../components';
import { AuthenticatedDrawerScreenProps } from '../../../navigators/AuthenticatedNavigator';
import { translate } from '../../../i18n';
import { typography, useAppTheme } from '../../../theme';
import BottomSheet from 'reanimated-bottom-sheet';
import Animated from 'react-native-reanimated';
import { useTaskVersion } from '../../../services/hooks/features/useTaskVersion';
import { ITaskVersionItemList } from '../../../services/interfaces/ITaskVersion';
import { BlurView } from 'expo-blur';
import VersionItem from './components/VersionItem';
import TaskVersionForm from './components/TaskVersionForm';

export const TaskVersionScreen: FC<AuthenticatedDrawerScreenProps<'TaskVersion'>> = function AuthenticatedDrawerScreen(
	_props
) {
	const { colors, dark } = useAppTheme();
	const { navigation } = _props;

	const { isLoading, versions, deleteTaskVersion, updateTaskVersion, createTaskVersion } = useTaskVersion();

	const [editMode, setEditMode] = useState(false);
	const [itemToEdit, setItemToEdit] = useState<ITaskVersionItemList>(null);
	const [isSheetOpen, setIsSheetOpen] = useState<boolean>(false);

	const sheetRef = useRef(null);

	const fall = new Animated.Value(1);
	const openForEdit = (item: ITaskVersionItemList) => {
		setEditMode(true);
		setIsSheetOpen(true);
		setItemToEdit(item);
		sheetRef.current.snapTo(0);
	};

	return (
		<Screen contentContainerStyle={[$container, { backgroundColor: colors.background2 }]} safeAreaEdges={['top']}>
			<StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
			<Animated.View>
				<View style={[$headerContainer, { backgroundColor: colors.background }]}>
					<View style={[styles.container, { backgroundColor: colors.background }]}>
						<TouchableOpacity onPress={() => navigation.navigate('Setting')}>
							<AntDesign name="arrowleft" size={24} color={colors.primary} />
						</TouchableOpacity>
						<Text style={[styles.title, { color: colors.primary }]}>
							{translate('settingScreen.versionScreen.mainTitle')}
						</Text>
					</View>
				</View>

				<View style={{ width: '100%', padding: 20, height: '80%' }}>
					<View>
						<Text style={styles.title2}>{translate('settingScreen.versionScreen.listOfVersions')}</Text>
					</View>
					<View
						style={{
							minHeight: 200,
							justifyContent: 'center',
							alignItems: 'center'
						}}
					>
						{isLoading ? <ActivityIndicator size={'small'} color={'#3826A6'} /> : null}
						{!isLoading && versions?.total === 0 ? (
							<Text style={{ ...styles.noVersionTxt, color: colors.primary }}>
								{translate('settingScreen.versionScreen.noActiveVersions')}
							</Text>
						) : null}

						<FlatList
							bounces={false}
							showsVerticalScrollIndicator={false}
							style={{ width: '100%' }}
							data={versions?.items}
							renderItem={({ item }) => (
								<VersionItem
									openForEdit={() => openForEdit(item)}
									onDeleteTask={() => deleteTaskVersion(item.id)}
									version={item}
								/>
							)}
							keyExtractor={(_, index) => index.toString()}
							ListFooterComponent={() => <View style={{ marginBottom: 40 }} />}
						/>
					</View>
				</View>
				<TouchableOpacity
					style={{
						...styles.createButton,
						borderColor: dark ? '#6755C9' : '#3826A6'
					}}
					onPress={() => {
						setEditMode(false);
						setIsSheetOpen(true);
						sheetRef.current.snapTo(0);
					}}
				>
					<Ionicons name="add" size={24} color={dark ? '#6755C9' : '#3826A6'} />
					<Text style={{ ...styles.btnText, color: dark ? '#6755C9' : '#3826A6' }}>
						{translate('settingScreen.versionScreen.createNewVersionButton')}
					</Text>
				</TouchableOpacity>
			</Animated.View>
			{isSheetOpen && (
				<BlurView
					intensity={15}
					tint="dark"
					style={{
						position: 'absolute',
						width: '100%',
						height: '100%'
					}}
				/>
			)}
			<BottomSheet
				ref={sheetRef}
				snapPoints={[280, 0]}
				borderRadius={24}
				initialSnap={1}
				callbackNode={fall}
				enabledGestureInteraction={true}
				renderContent={() => (
					<TaskVersionForm
						item={itemToEdit}
						onDismiss={() => {
							setEditMode(false);
							setIsSheetOpen(false);
							sheetRef.current.snapTo(1);
						}}
						onUpdateVersion={updateTaskVersion}
						onCreateVersion={createTaskVersion}
						isEdit={editMode}
					/>
				)}
			/>
		</Screen>
	);
};

const $container: ViewStyle = {
	flex: 1
};
const $headerContainer: ViewStyle = {
	padding: 20,
	paddingVertical: 16,
	shadowColor: 'rgba(0, 0, 0, 0.6)',
	shadowOffset: {
		width: 0,
		height: 2
	},
	shadowOpacity: 0.07,
	shadowRadius: 1.0,
	elevation: 1,
	zIndex: 10
};

const styles = StyleSheet.create({
	btnText: {
		color: '#3826A6',
		fontFamily: typography.primary.semiBold,
		fontSize: 18,
		fontStyle: 'normal'
	},
	container: {
		alignItems: 'center',
		flexDirection: 'row',
		width: '100%'
	},
	createButton: {
		alignItems: 'center',
		alignSelf: 'center',
		borderColor: '#3826A6',
		borderRadius: 12,
		borderWidth: 2,
		flexDirection: 'row',
		justifyContent: 'center',
		marginTop: 24,
		padding: 16,
		width: '90%'
	},
	noVersionTxt: {
		color: '#7E7991',
		fontFamily: typography.primary.semiBold,
		fontSize: 16
	},
	title: {
		alignSelf: 'center',
		fontFamily: typography.primary.semiBold,
		fontSize: 16,
		textAlign: 'center',
		width: '80%'
	},
	title2: {
		color: '#7E7991',
		fontFamily: typography.primary.semiBold,
		fontSize: 16,
		marginBottom: 8
	}
});
