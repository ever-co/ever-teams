/* eslint-disable react-native/no-inline-styles */
import React, { FC, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
	View,
	ViewStyle,
	LogBox,
	StatusBar,
	Keyboard,
	Text,
	StyleSheet,
	Platform,
	KeyboardAvoidingView
} from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// COMPONENTS
import { Screen } from '../../../components';
import { GLOBAL_STYLE as GS } from '../../../../assets/ts/styles';
import { AuthenticatedDrawerScreenProps, SettingScreenRouteProp } from '../../../navigators/AuthenticatedNavigator';
import SectionTab from './components/SectionTab';
import SettingHeader from './components/SettingHeader';
import { useSettings } from '../../../services/hooks/features/useSettings';
import BottomSheetContent from './components/BottomSheetContent';
import PersonalSettings from './Personal';
import TeamSettings from './Team';
import { useAppTheme } from '../../../theme';
import { useOrganizationTeam } from '../../../services/hooks/useOrganization';
import { useRoute } from '@react-navigation/native';

export type IPopup =
	| 'Names'
	| 'Team Name'
	| 'Contact'
	| 'Language'
	| 'TimeZone'
	| 'Schedule'
	| 'Remove Team'
	| 'Avatar'
	| 'Avatar 2'
	| 'Team Logo'
	| 'Quit Team'
	| 'Delete Account'
	| 'Remove Account';

export const AuthenticatedSettingScreen: FC<AuthenticatedDrawerScreenProps<'Setting'>> =
	function AuthenticatedDrawerScreen(_props) {
		LogBox.ignoreAllLogs();
		const { colors, dark } = useAppTheme();
		const { isLoading } = useSettings();
		const { activeTeam } = useOrganizationTeam();
		const route = useRoute<SettingScreenRouteProp<'Setting'>>();

		// ref
		const bottomSheetRef = useRef<BottomSheet>(null);

		// STATES
		const [activeTab, setActiveTab] = useState(route.params?.activeTab || 1);
		const [showPopup, setShowPopup] = useState<IPopup>(null);
		const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
		const [keyboardVisible, setKeyboardVisible] = useState(false);
		const [keyboardHeight, setKeyboardHeight] = useState(0);
		const [desiredSnapIndex, setDesiredSnapIndex] = useState(1); // New state for tracking desired snap index

		// Include multiple snap points for different sheet heights
		const snapPoints = useMemo(() => ['1%', '50%', '70%', '85%'], []);

		// Fixed open function without setTimeout
		const openBottomSheet = useCallback((name: IPopup, snapPoint: number = 1) => {
			// Calculate desired snap index based on the snapPoint parameter
			let snapIndex = 1; // Default 50%

			if (snapPoint === 3 || snapPoint >= 5) {
				snapIndex = 2; // 70%
			} else if (snapPoint === 4) {
				snapIndex = 3; // 85% for keyboard-heavy forms
			}

			// Update state values
			setShowPopup(name);
			setBottomSheetVisible(true);
			setDesiredSnapIndex(snapIndex);
		}, []);

		// Handle closing the sheet
		const handleClose = useCallback(() => {
			// Close the sheet first
			if (bottomSheetRef.current) {
				bottomSheetRef.current.close();
			}

			// Clear state after animation completes
			setTimeout(() => {
				setShowPopup(null);
				setBottomSheetVisible(false);
				Keyboard.dismiss();
			}, 250);
		}, []);

		// Make sure sheet is properly closed on component unmount
		useEffect(() => {
			return () => {
				if (bottomSheetRef.current) {
					bottomSheetRef.current.close();
				}
			};
		}, []);

		// Effect to handle bottom sheet snap index when state changes
		useEffect(() => {
			if (bottomSheetVisible && bottomSheetRef.current && showPopup) {
				bottomSheetRef.current.snapToIndex(desiredSnapIndex);
			}
		}, [bottomSheetVisible, showPopup, desiredSnapIndex]);

		// Keyboard listeners to adjust the sheet height when keyboard appears
		useEffect(() => {
			const keyboardWillShowListener = Keyboard.addListener(
				Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
				(e) => {
					setKeyboardVisible(true);
					setKeyboardHeight(e.endCoordinates.height);

					// If form sheet is open, adjust its height to accommodate keyboard
					if (bottomSheetVisible && bottomSheetRef.current) {
						// Snap to a higher position when keyboard is visible
						setDesiredSnapIndex(3); // Use the highest snap point (85%)
					}
				}
			);

			const keyboardWillHideListener = Keyboard.addListener(
				Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
				() => {
					setKeyboardVisible(false);
					setKeyboardHeight(0);

					// If form sheet is still open, return to normal height
					if (bottomSheetVisible && bottomSheetRef.current && showPopup) {
						// Return to the original snap point if still open
						// Map from old snapPoint system
						const snapIndex = showPopup === 'TimeZone' || showPopup === 'Language' ? 2 : 1;
						setDesiredSnapIndex(snapIndex);
					}
				}
			);

			return () => {
				keyboardWillShowListener.remove();
				keyboardWillHideListener.remove();
			};
		}, [bottomSheetVisible, showPopup]);

		// Better backdrop with proper opacity
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
			<GestureHandlerRootView style={styles.gestureRoot}>
				{/* Main Screen Content */}
				<View style={styles.mainContainer}>
					<Screen
						contentContainerStyle={[$container, { backgroundColor: colors.background }]}
						safeAreaEdges={['top']}
					>
						<StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
						<View style={{ flex: 1 }}>
							<View style={[$headerContainer, { flex: 0.75, backgroundColor: colors.background }]}>
								<SettingHeader {..._props} />
								<SectionTab activeTabId={activeTab} toggleTab={setActiveTab} />
							</View>
							<View style={{ flex: 4, paddingHorizontal: 20 }}>
								{isLoading ? (
									<View
										style={{
											flex: 1,
											justifyContent: 'center',
											alignItems: 'center',
											width: '100%'
										}}
									>
										<ActivityIndicator size={'small'} />
									</View>
								) : activeTab === 1 ? (
									<PersonalSettings onOpenBottomSheet={openBottomSheet} />
								) : activeTeam ? (
									<TeamSettings props={{ ..._props }} onOpenBottomSheet={openBottomSheet} />
								) : null}
							</View>
						</View>
					</Screen>
				</View>

				{/* Bottom Sheet Container */}
				<View
					style={[
						styles.sheetContainer,
						{
							pointerEvents: bottomSheetVisible ? 'auto' : 'none',
							zIndex: bottomSheetVisible ? 1000 : -1
						}
					]}
				>
					<KeyboardAvoidingView
						behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
						style={{ flex: 1 }}
						keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
					>
						<BottomSheet
							ref={bottomSheetRef}
							index={0}
							snapPoints={snapPoints}
							enablePanDownToClose={true}
							onClose={handleClose}
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
									minHeight: 400,
									paddingBottom: keyboardVisible ? keyboardHeight + 20 : 20
								}}
								keyboardShouldPersistTaps="handled"
								showsVerticalScrollIndicator={true}
								style={{
									backgroundColor: colors.background
								}}
							>
								{showPopup ? (
									<BottomSheetContent
										openedSheet={showPopup}
										onDismiss={handleClose}
										openBottomSheet={openBottomSheet}
									/>
								) : (
									<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
										<Text>Loading...</Text>
									</View>
								)}
							</BottomSheetScrollView>
						</BottomSheet>
					</KeyboardAvoidingView>
				</View>
			</GestureHandlerRootView>
		);
	};

const $container: ViewStyle = {
	...GS.flex1
};

const $headerContainer: ViewStyle = {
	padding: 20,
	paddingBottom: 32
};

const styles = StyleSheet.create({
	gestureRoot: {
		flex: 1,
		position: 'relative'
	},
	mainContainer: {
		flex: 1,
		position: 'relative',
		zIndex: 1
	},
	sheetContainer: {
		position: 'absolute',
		left: 0,
		right: 0,
		top: 0,
		bottom: 0,
		zIndex: 1000
	}
});
