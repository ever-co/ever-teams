/* eslint-disable react-native/no-color-literals */
import React, { ReactElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Animated, Keyboard, StatusBar, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { ArrowLeft } from '../../src/components/icons';
import BottomSheet, {
	BottomSheetBackdrop,
	BottomSheetBackdropProps,
	BottomSheetScrollView
} from '@gorhom/bottom-sheet';
import { ActivityIndicator } from 'react-native-paper';
import { Screen } from './screen';
import { TaskSettingAddButton } from './task-setting-add-button';
import { TaskSettingsList } from './task-settings-list';
import { typography, useAppTheme, useWebTheme } from '../theme';
import { sheetLookOf, sheetOverlayOpacity } from '../../src/theme/sheet-look';
import { useTaskSettingsAccess } from '../services/hooks/features/use-task-settings-access';
import { readOnlyOpacity } from '../helpers/read-only-opacity';

/** A status, priority, size or version as far as the screen goes: the team it belongs to decides who may change it. */
type SettingRow = { organizationTeamId?: string | null };

export interface TaskSettingsTexts {
	title: string;
	listTitle: string;
	create: string;
	empty: string;
}

/** How the form's sheet meets the keyboard; the versions screen kept its own. */
export interface TaskSettingsSheet {
	keyboardBehavior: 'interactive' | 'extend';
	keyboardBlurBehavior: 'restore' | 'none';
	keyboardShouldPersistTaps: 'handled' | 'always';
	contentStyle: ViewStyle;
	/** Whether the list grows to the screen's height. */
	listGrows: boolean;
}

export const DEFAULT_SETTINGS_SHEET: TaskSettingsSheet = {
	keyboardBehavior: 'interactive',
	keyboardBlurBehavior: 'restore',
	keyboardShouldPersistTaps: 'handled',
	contentStyle: { flexGrow: 1 },
	listGrows: true
};

export interface SettingRowProps {
	openForEdit: () => void;
	readOnly: boolean;
}

export interface SettingFormProps<T> {
	item: T | null;
	isEdit: boolean;
	onDismiss: () => void;
}

interface ITaskSettingsScreen<T extends SettingRow> {
	texts: TaskSettingsTexts;
	isLoading: boolean;
	items: T[] | undefined;
	total: number | undefined;
	keyOf: (item: T, index: number) => string;
	renderRow: (item: T, row: SettingRowProps) => ReactElement;
	renderForm: (form: SettingFormProps<T>) => ReactElement;
	onBack: () => void;
	sheet?: TaskSettingsSheet;
}

/** The list fills the screen's height, unless the screen keeps the list at its content's. */
function listContentStyleOf(sheet: TaskSettingsSheet): ViewStyle | undefined {
	if (sheet.listGrows) {
		return styles.listGrows;
	}
	return undefined;
}

function statusBarStyleOf(dark: boolean): 'light-content' | 'dark-content' {
	if (dark) {
		return 'light-content';
	}
	return 'dark-content';
}

/** The sheet's layer takes touches only while the sheet is open, and sits under the screen otherwise. */
function sheetLayerOf(isOpen: boolean): ViewStyle {
	if (isOpen) {
		return { pointerEvents: 'auto', zIndex: 1000 };
	}
	return { pointerEvents: 'none', zIndex: -1 };
}

/**
 * A team's task statuses, priorities, sizes or versions in Settings: the header and its back arrow, the list with its
 * Create buttons and the read-only reason, and the form in a sheet to create or edit a value.
 */
function TaskSettingsScreenView<T extends SettingRow>({
	texts,
	isLoading,
	items,
	total,
	keyOf,
	renderRow,
	renderForm,
	onBack,
	sheet = DEFAULT_SETTINGS_SHEET
}: Readonly<ITaskSettingsScreen<T>>) {
	const { colors, dark } = useAppTheme();
	const sheetLook = sheetLookOf(useWebTheme());
	const { canCreate, canWriteRow, readOnlyHint } = useTaskSettingsAccess();
	const createReadOnly = !canCreate;
	const createOpacity = readOnlyOpacity(createReadOnly);
	const hasReadOnlyRow = (items ?? []).some((item) => !canWriteRow(item));
	const showsReadOnlyHint = createReadOnly || hasReadOnlyRow;
	const isEmpty = !isLoading && total === 0;
	const [editMode, setEditMode] = useState(false);
	const [itemToEdit, setItemToEdit] = useState<T | null>(null);
	const [bottomSheetVisible, setBottomSheetVisible] = useState(false);

	const sheetRef = useRef<BottomSheet>(null);
	// the reset a close schedules once its animation is over, which a form opened meanwhile cancels
	const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const snapPoints = useMemo(() => ['60%'], []);

	const cancelClose = useCallback(() => {
		if (closeTimer.current) {
			clearTimeout(closeTimer.current);
			closeTimer.current = null;
		}
	}, []);

	// The sheet opens a moment after its content is set, so it snaps with the form in place
	const openSheet = useCallback(() => {
		cancelClose();
		setBottomSheetVisible(true);
		setTimeout(() => {
			sheetRef.current?.snapToIndex(0);
		}, 150);
	}, [cancelClose]);

	const openForEdit = useCallback(
		(item: T) => {
			setEditMode(true);
			setItemToEdit(item);
			openSheet();
		},
		[openSheet]
	);

	const handleCreateNew = useCallback(() => {
		setEditMode(false);
		setItemToEdit(null);
		openSheet();
	}, [openSheet]);

	const handleClose = useCallback(() => {
		sheetRef.current?.close();
		// the state clears once the sheet's close animation is over
		closeTimer.current = setTimeout(() => {
			closeTimer.current = null;
			setBottomSheetVisible(false);
			Keyboard.dismiss();
		}, 250);
	}, []);

	useEffect(() => {
		const sheetOnScreen = sheetRef.current;
		return () => {
			sheetOnScreen?.close();
			cancelClose();
		};
	}, [cancelClose]);

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

	return (
		<Screen contentContainerStyle={[$container, { backgroundColor: colors.background2 }]} safeAreaEdges={['top']}>
			<StatusBar barStyle={statusBarStyleOf(dark)} />
			<Animated.View style={styles.fill}>
				<View style={[$headerContainer, { backgroundColor: colors.background }]}>
					<View style={[styles.container, { backgroundColor: colors.background }]}>
						<TouchableOpacity accessibilityRole="button" onPress={() => onBack()}>
							<ArrowLeft size={24} color={colors.primary} />
						</TouchableOpacity>
						<Text style={[styles.title, { color: colors.primary }]}>{texts.title}</Text>
					</View>
				</View>

				<View style={styles.body}>
					<View style={styles.listHeaderContainer}>
						<Text style={styles.title2}>{texts.listTitle}</Text>
						<TaskSettingAddButton
							label={texts.create}
							iconSize={18}
							disabled={createReadOnly}
							style={{ ...styles.createButtonSmall, opacity: createOpacity }}
							textStyle={styles.btnTextSmall}
							onPress={handleCreateNew}
						/>
					</View>
					{showsReadOnlyHint && (
						<Text style={{ ...styles.readOnlyHint, color: colors.tertiary }}>{readOnlyHint}</Text>
					)}

					<View style={styles.list}>
						{isLoading && <ActivityIndicator size={'small'} color={'#3826A6'} />}
						{isEmpty && <Text style={{ ...styles.emptyText, color: colors.primary }}>{texts.empty}</Text>}

						<TaskSettingsList
							bounces={false}
							showsVerticalScrollIndicator={false}
							style={styles.listView}
							contentContainerStyle={listContentStyleOf(sheet)}
							data={items}
							renderItem={({ item }) =>
								renderRow(item, { openForEdit: () => openForEdit(item), readOnly: !canWriteRow(item) })
							}
							keyExtractor={keyOf}
						/>
					</View>
				</View>

				<TaskSettingAddButton
					label={texts.create}
					iconSize={24}
					disabled={createReadOnly}
					style={{ ...styles.createButton, opacity: createOpacity }}
					textStyle={styles.btnText}
					onPress={handleCreateNew}
				/>
			</Animated.View>

			<View style={[styles.sheetLayer, sheetLayerOf(bottomSheetVisible)]}>
				<BottomSheet
					ref={sheetRef}
					index={-1}
					snapPoints={snapPoints}
					enablePanDownToClose={true}
					onClose={handleClose}
					backdropComponent={renderBackdrop}
					enableContentPanningGesture={true}
					keyboardBehavior={sheet.keyboardBehavior}
					keyboardBlurBehavior={sheet.keyboardBlurBehavior}
					android_keyboardInputMode="adjustResize"
					backgroundStyle={sheetLook.background}
					handleIndicatorStyle={sheetLook.handle}
				>
					<BottomSheetScrollView
						style={{ backgroundColor: colors.background }}
						contentContainerStyle={sheet.contentStyle}
						keyboardShouldPersistTaps={sheet.keyboardShouldPersistTaps}
						showsVerticalScrollIndicator={false}
					>
						{bottomSheetVisible &&
							renderForm({ item: itemToEdit, isEdit: editMode, onDismiss: handleClose })}
					</BottomSheetScrollView>
				</BottomSheet>
			</View>
		</Screen>
	);
}

// The access rights come from MobX stores: the screen draws again when they change
export const TaskSettingsScreen = observer(TaskSettingsScreenView) as typeof TaskSettingsScreenView;

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
	body: {
		flex: 1,
		padding: 20,
		width: '100%'
	},
	btnText: {
		color: '#3826A6',
		fontFamily: typography.primary.semiBold,
		fontSize: 18,
		fontStyle: 'normal',
		marginLeft: 8
	},
	btnTextSmall: {
		color: '#3826A6',
		fontFamily: typography.primary.semiBold,
		fontSize: 14,
		fontStyle: 'normal',
		marginLeft: 4
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
		marginBottom: 16,
		marginTop: 8,
		padding: 14,
		width: '90%'
	},
	createButtonSmall: {
		alignItems: 'center',
		borderColor: '#3826A6',
		borderRadius: 8,
		borderWidth: 1,
		flexDirection: 'row',
		justifyContent: 'center',
		padding: 6,
		paddingHorizontal: 10
	},
	emptyText: {
		color: '#7E7991',
		fontFamily: typography.primary.semiBold,
		fontSize: 16
	},
	fill: {
		flex: 1
	},
	list: {
		flex: 1,
		width: '100%'
	},
	listGrows: {
		flexGrow: 1
	},
	listHeaderContainer: {
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 12,
		width: '100%'
	},
	listView: {
		width: '100%'
	},
	readOnlyHint: {
		fontFamily: typography.primary.medium,
		fontSize: 14,
		marginBottom: 12
	},
	sheetLayer: {
		bottom: 0,
		left: 0,
		position: 'absolute',
		right: 0,
		top: 0
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
		fontSize: 16
	}
});
