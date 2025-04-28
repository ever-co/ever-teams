/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC, useState, useRef, useMemo } from 'react';
import { View, Text, ViewStyle, TouchableOpacity, StyleSheet, FlatList, StatusBar, Animated } from 'react-native';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../components';
import { AuthenticatedDrawerScreenProps } from '../../../navigators/AuthenticatedNavigator';
import { translate } from '../../../i18n';
import BottomSheet from '@gorhom/bottom-sheet';
import { typography, useAppTheme } from '../../../theme';
import { ActivityIndicator } from 'react-native-paper';
import { ITaskPriorityItem } from '../../../services/interfaces/ITaskPriority';
import TaskPriorityForm from './components/TaskPriorityForm';
import { useTaskPriority } from '../../../services/hooks/features/useTaskPriority';
import PriorityItem from './components/PriorityItem';
import { BlurView } from 'expo-blur';

export const TaskPriorityScreen: FC<AuthenticatedDrawerScreenProps<'TaskPriority'>> =
	function AuthenticatedDrawerScreen(_props) {
		const { colors, dark } = useAppTheme();
		const { navigation } = _props;
		const { isLoading, priorities, deletePriority, updatePriority, createPriority } = useTaskPriority();
		const [editMode, setEditMode] = useState(false);
		const [itemToEdit, setItemToEdit] = useState<ITaskPriorityItem>(null);
		const [isSheetOpen, setIsSheetOpen] = useState<boolean>(false);

		// ref
		const sheetRef = useRef<BottomSheet>(null);

		// Define snap points
		const snapPoints = useMemo(() => [452, 0], []);

		const openForEdit = (item: ITaskPriorityItem) => {
			setEditMode(true);
			setIsSheetOpen(true);
			setItemToEdit(item);
			sheetRef.current?.snapToIndex(0);
		};

		return (
			<Screen
				contentContainerStyle={[$container, { backgroundColor: colors.background2 }]}
				safeAreaEdges={['top']}
			>
				<StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
				<Animated.View style={{ flex: 1 }}>
					<View style={[$headerContainer, { backgroundColor: colors.background }]}>
						<View style={[styles.container, { backgroundColor: colors.background }]}>
							<TouchableOpacity onPress={() => navigation.navigate('Setting')}>
								<AntDesign name="arrowleft" size={24} color={colors.primary} />
							</TouchableOpacity>
							<Text style={[styles.title, { color: colors.primary }]}>
								{translate('settingScreen.priorityScreen.mainTitle')}
							</Text>
						</View>
					</View>
					<View style={{ width: '100%', padding: 20, flex: 1 }}>
						<View>
							<Text style={styles.title2}>
								{translate('settingScreen.priorityScreen.listPriorities')}
							</Text>
						</View>
						<View
							style={{
								minHeight: 200,
								justifyContent: 'center',
								alignItems: 'center'
							}}
						>
							{isLoading ? <ActivityIndicator size={'small'} color={'#3826A6'} /> : null}
							{!isLoading && priorities?.total === 0 ? (
								<Text style={{ ...styles.noStatusTxt, color: colors.primary }}>
									{translate('settingScreen.priorityScreen.noActivePriorities')}
								</Text>
							) : null}
							<View
              style={{
                flex: 1,
                width: '100%',
              }}
              >
								<FlatList
									bounces={false}
									showsVerticalScrollIndicator={false}
									style={{ width: '100%' }}
                  contentContainerStyle={{ flexGrow: 1 }}
									data={priorities?.items}
									renderItem={({ item }) => (
										<PriorityItem
											openForEdit={() => openForEdit(item)}
											onDeletePriority={() => deletePriority(item.id)}
											priority={item}
										/>
									)}
									keyExtractor={(_, index) => index.toString()}
									ListFooterComponent={() => <View style={{ marginBottom: 40 }} />}
								/>
							</View>
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
							sheetRef.current?.snapToIndex(0);
						}}
					>
						<Ionicons name="add" size={24} color={dark ? '#6755C9' : '#3826A6'} />
						<Text style={{ ...styles.btnText, color: dark ? '#6755C9' : '#3826A6' }}>
							{translate('settingScreen.priorityScreen.createNewPriorityText')}
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
					snapPoints={snapPoints}
					index={1}
					enablePanDownToClose={true}
					//   handleRadius={24}
					backgroundStyle={{
						backgroundColor: colors.background,
						borderTopLeftRadius: 24,
						borderTopRightRadius: 24
					}}
					handleIndicatorStyle={{
						backgroundColor: dark ? '#FFFFFF' : '#000000',
						width: 50,
						height: 5
					}}
					onChange={(index) => setIsSheetOpen(index === 0)}
				>
					<View style={{ padding: 16, flex: 1 }}>
						<TaskPriorityForm
							item={itemToEdit}
							onDismiss={() => {
								setEditMode(false);
								setIsSheetOpen(false);
								// sheetRef.current?.close();
								sheetRef.current?.snapToIndex(1);
							}}
							onUpdatePriority={updatePriority}
							onCreatePriority={createPriority}
							isEdit={editMode}
						/>
					</View>
				</BottomSheet>
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
	noStatusTxt: {
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
