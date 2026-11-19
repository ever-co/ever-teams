import React, { FC, useCallback } from 'react';
import { Modal, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet, { BottomSheetBackdrop, BottomSheetBackdropProps, BottomSheetView } from '@gorhom/bottom-sheet';
import { observer } from 'mobx-react-lite';
import { useWebTheme } from '../theme';
import { sheetLookOf, sheetOverlayOpacity } from '../../src/theme/sheet-look';
import { useTimerStartMove } from '../services/hooks/use-timer-start-move';
import TimerStartPanel from './timer-start-panel';

interface ITimerStartSheetProps {
	visible: boolean;
	onClose: () => void;
}

/**
 * The bottom sheet of the running time, as the settings screens open theirs: tapping the running time on the timer
 * card or in the header timer opens it over the screen.
 */
const TimerStartSheet: FC<ITimerStartSheetProps> = observer(({ visible, onClose }) => {
	const sheetLook = sheetLookOf(useWebTheme());
	const { access, runStart, saving, moveStart } = useTimerStartMove({ enabled: visible });

	const renderBackdrop = useCallback(
		(props: BottomSheetBackdropProps) => (
			<BottomSheetBackdrop
				{...props}
				disappearsOnIndex={-1}
				appearsOnIndex={0}
				enableTouchThrough={false}
				pressBehavior="close"
				opacity={sheetOverlayOpacity}
			/>
		),
		[]
	);

	if (!visible) {
		return null;
	}

	return (
		<Modal transparent visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
			<GestureHandlerRootView style={styles.root}>
				<BottomSheet
					index={0}
					enableDynamicSizing
					enablePanDownToClose
					onClose={onClose}
					backdropComponent={renderBackdrop}
					backgroundStyle={sheetLook.background}
					handleIndicatorStyle={sheetLook.handle}
					keyboardBehavior="interactive"
					keyboardBlurBehavior="restore"
					android_keyboardInputMode="adjustPan"
				>
					<BottomSheetView>
						<TimerStartPanel
							access={access}
							runStart={runStart}
							saving={saving}
							onSave={moveStart}
							onClose={onClose}
						/>
					</BottomSheetView>
				</BottomSheet>
			</GestureHandlerRootView>
		</Modal>
	);
});

const styles = StyleSheet.create({
	root: {
		flex: 1
	}
});

export default TimerStartSheet;
