// Changes to TaskVersionScreen.tsx
import React, { FC, useRef, useState, useMemo, useCallback, useEffect } from 'react';
import {
	View,
	Text,
	ViewStyle,
	TouchableOpacity,
	StyleSheet,
	ActivityIndicator,
	FlatList,
	StatusBar,
	Keyboard,
	Animated,
	Platform
} from 'react-native';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../components';
import { AuthenticatedDrawerScreenProps } from '../../../navigators/AuthenticatedNavigator';
import { translate } from '../../../i18n';
import { typography, useAppTheme } from '../../../theme';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
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
	const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
	const [keyboardVisible, setKeyboardVisible] = useState(false);
	const [keyboardHeight, setKeyboardHeight] = useState(0);
	const [desiredSnapIndex, setDesiredSnapIndex] = useState(0); // Track desired snap index

	const sheetRef = useRef<BottomSheet>(null);

	// Define snap points - similar to the working implementation
	// Use multiple snap points like in the working example
	const snapPoints = useMemo(() => ['25%', '50%', '70%'], []);

	const openForEdit = useCallback((item: ITaskVersionItemList) => {
		setEditMode(true);
		setItemToEdit(item);
		setBottomSheetVisible(true);

		// Important: We need to set the snap index and then force a sheet update
		setDesiredSnapIndex(1); // Use 50% height for edit

		// Force immediate update of the sheet position

		const timer = setTimeout(() => {
			if (sheetRef.current) {
				sheetRef.current.snapToIndex(1);
			}
		}, 150);
		return () => clearTimeout(timer);
	}, []);

	const handleCreateNew = useCallback(() => {
		setEditMode(false);
		setItemToEdit(null);
		setBottomSheetVisible(true);

		// Important: We need to set the snap index and then force a sheet update
		setDesiredSnapIndex(1); // Use 50% height for new version

		// Force immediate update of the sheet position
		const timer = setTimeout(() => {
			if (sheetRef.current) {
				sheetRef.current.snapToIndex(1);
			}
		}, 150);
		return () => clearTimeout(timer);
	}, []);

	const handleClose = useCallback(() => {
		if (sheetRef.current) {
			sheetRef.current.close();
		}

		// Clear state after animation completes
		const timer = setTimeout(() => {
			setBottomSheetVisible(false);
      setItemToEdit(null);
		}, 100);
		return () => clearTimeout(timer);
	}, [desiredSnapIndex]);

	// Effect to handle bottom sheet snap index when state changes
	useEffect(() => {
		if (bottomSheetVisible && sheetRef.current) {
			console.log('Snapping to index:', desiredSnapIndex);
			// Add small delay to ensure sheet is ready
			setTimeout(() => {
				sheetRef.current.snapToIndex(desiredSnapIndex);
			}, 100);
		}
	}, [bottomSheetVisible, desiredSnapIndex]);

	// Clean up on unmount
	useEffect(() => {
		return () => {
			if (sheetRef.current) {
				sheetRef.current.close();
			}
		};
	}, []);

	// Keyboard listeners
	useEffect(() => {
		const keyboardWillShowListener = Keyboard.addListener(
			Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
			(e) => {
				setKeyboardVisible(true);
				setKeyboardHeight(e.endCoordinates.height);

				// If sheet is open, adjust height for keyboard
				if (bottomSheetVisible && sheetRef.current) {
					setDesiredSnapIndex(2); // Use higher snap point for keyboard
				}
			}
		);

		const keyboardWillHideListener = Keyboard.addListener(
			Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
			() => {
				setKeyboardVisible(false);
				setKeyboardHeight(0);

				// If sheet is still open, return to normal height
				if (bottomSheetVisible && sheetRef.current) {
					setDesiredSnapIndex(1); // Return to default height
				}
			}
		);

		return () => {
			keyboardWillShowListener.remove();
			keyboardWillHideListener.remove();
		};
	}, [bottomSheetVisible]);

	// Backdrop component
	const renderBackdrop = useCallback(
		(props) => (
			<BottomSheetBackdrop
				{...props}
				disappearsOnIndex={-1}
				appearsOnIndex={0}
				enableTouchThrough={false}
				pressBehavior="close"
				opacity={0.7}
			/>
		),
		[]
	);

	return (
		<Screen contentContainerStyle={[$container, { backgroundColor: colors.background2 }]} safeAreaEdges={['top']}>
			<StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
			<Animated.View style={{ flex: 1 }}>
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
					onPress={handleCreateNew}
				>
					<Ionicons name="add" size={24} color={dark ? '#6755C9' : '#3826A6'} />
					<Text style={{ ...styles.btnText, color: dark ? '#6755C9' : '#3826A6' }}>
						{translate('settingScreen.versionScreen.createNewVersionButton')}
					</Text>
				</TouchableOpacity>
			</Animated.View>

			{/* Bottom Sheet Container */}
			<View
				style={[
					{
						position: 'absolute',
						left: 0,
						right: 0,
						top: 0,
						bottom: 0,
						pointerEvents: bottomSheetVisible ? 'auto' : 'none',
						zIndex: bottomSheetVisible ? 1000 : -1
					}
				]}
			>
				<BottomSheet
					ref={sheetRef}
					index={-1} // Start closed (-1)
					snapPoints={snapPoints}
					enablePanDownToClose={true}
					onClose={handleClose} // Add onClose handler
					backdropComponent={renderBackdrop}
					enableContentPanningGesture={true}
					keyboardBehavior="extend"
					keyboardBlurBehavior="restore"
					android_keyboardInputMode="adjustResize"
					backgroundStyle={{
						backgroundColor: colors.background,
						shadowColor: '#000',
						shadowOffset: { width: 0, height: -3 },
						shadowOpacity: 0.27,
						shadowRadius: 4.65,
						elevation: 10,
						borderTopLeftRadius: 20,
						borderTopRightRadius: 20
					}}
					handleIndicatorStyle={{
						backgroundColor: dark ? '#FFFFFF' : '#000000',
						width: 50,
						height: 5,
						marginTop: 10
					}}
				>
					<BottomSheetScrollView
						contentContainerStyle={{
							flexGrow: 1,
							paddingBottom: keyboardVisible ? keyboardHeight + 20 : 20
						}}
						keyboardShouldPersistTaps="handled"
						showsVerticalScrollIndicator={true}
						style={{
							backgroundColor: colors.background
						}}
					>
						{bottomSheetVisible && (
							<TaskVersionForm
								item={itemToEdit}
								onDismiss={handleClose}
								onUpdateVersion={updateTaskVersion}
								onCreateVersion={createTaskVersion}
								isEdit={editMode}
							/>
						)}
					</BottomSheetScrollView>
				</BottomSheet>
			</View>

			{/* BlurView shown when the bottom sheet is open */}
			{bottomSheetVisible && (
				<BlurView
					intensity={15}
					tint="dark"
					style={{
						position: 'absolute',
						width: '100%',
						height: '100%',
						zIndex: 999 // Just below the sheet container
					}}
				/>
			)}
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
