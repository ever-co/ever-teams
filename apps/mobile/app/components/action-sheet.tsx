import React, { FC, useCallback, useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet, {
	BottomSheetBackdrop,
	BottomSheetBackdropProps,
	BottomSheetScrollView
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { typography, useWebTheme } from '../theme';
import { sheetLookOf } from '../../src/theme/sheet-look';
import type { Theme } from '../../src/theme/use-theme';

export interface ActionSheetAction {
	key: string;
	label: string;
	onPress: () => void;
	destructive?: boolean;
}

interface IActionSheetProps {
	visible: boolean;
	onClose: () => void;
	actions: ActionSheetAction[];
	title?: string;
}

export function actionColorOf(action: ActionSheetAction, theme: Theme): string {
	if (action.destructive) {
		return theme.colors['destructive-ink'];
	}
	return theme.colors.foreground;
}

function rowBackgroundOf(pressed: boolean, theme: Theme): string {
	if (pressed) {
		return theme.foreground(5);
	}
	return 'transparent';
}

/** The actions of a card as a bottom sheet: a tap on an action closes the sheet first, then runs the action. */
const ActionSheet: FC<IActionSheetProps> = ({ visible, onClose, actions, title }) => {
	const theme = useWebTheme();
	const look = sheetLookOf(theme);
	const insets = useSafeAreaInsets();
	const hasTitle = Boolean(title);
	const hasActions = actions.length > 0;

	// A sheet whose actions went away while open closes, so it never opens again by itself when they come back
	useEffect(() => {
		const lostItsActions = visible && !hasActions;
		if (lostItsActions) {
			onClose();
		}
	}, [visible, hasActions, onClose]);

	const renderBackdrop = useCallback(
		(props: BottomSheetBackdropProps) => (
			<BottomSheetBackdrop
				{...props}
				disappearsOnIndex={-1}
				appearsOnIndex={0}
				enableTouchThrough={false}
				pressBehavior="close"
				opacity={look.overlayOpacity}
			/>
		),
		[look.overlayOpacity]
	);

	const isShown = visible && hasActions;
	if (!isShown) {
		return null;
	}

	const runAction = (action: ActionSheetAction) => {
		onClose();
		action.onPress();
	};

	return (
		<Modal transparent visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
			<GestureHandlerRootView style={styles.root}>
				<BottomSheet
					index={0}
					enableDynamicSizing
					enablePanDownToClose
					onClose={onClose}
					backdropComponent={renderBackdrop}
					backgroundStyle={look.background}
					handleIndicatorStyle={look.handle}
				>
					<BottomSheetScrollView
						testID="action-sheet"
						contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 8 }]}
					>
						{hasTitle && (
							<Text numberOfLines={1} style={[styles.title, { color: theme.colors['muted-foreground'] }]}>
								{title}
							</Text>
						)}
						<View>
							{actions.map((action) => (
								<Pressable
									key={action.key}
									testID={`action-${action.key}`}
									accessibilityRole="button"
									onPress={() => runAction(action)}
									style={({ pressed }) => [
										styles.row,
										{ backgroundColor: rowBackgroundOf(pressed, theme) }
									]}
								>
									<Text style={[styles.label, { color: actionColorOf(action, theme) }]}>
										{action.label}
									</Text>
								</Pressable>
							))}
						</View>
					</BottomSheetScrollView>
				</BottomSheet>
			</GestureHandlerRootView>
		</Modal>
	);
};

const styles = StyleSheet.create({
	content: {
		paddingHorizontal: 8
	},
	label: {
		fontFamily: typography.fonts.PlusJakartaSans.medium,
		fontSize: 15,
		fontWeight: '500'
	},
	root: {
		flex: 1
	},
	row: {
		borderRadius: 10,
		justifyContent: 'center',
		minHeight: 48,
		paddingHorizontal: 16
	},
	title: {
		fontFamily: typography.primary.normal,
		fontSize: 13,
		paddingBottom: 6,
		paddingHorizontal: 16
	}
});

export default ActionSheet;
