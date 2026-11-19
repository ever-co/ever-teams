/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
	View,
	StyleSheet,
	TextInput,
	Text,
	ViewStyle,
	TouchableWithoutFeedback,
	Dimensions,
	Pressable,
	Platform
} from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { GLOBAL_STYLE as GS } from '../../../../../assets/ts/styles';
import ComboBox from './combo-box';
import EstimateTime from './estimate-time';
import { Feather } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import TaskPriorities from '../../../../components/task-priority';
// import TaskLabel from "../../../../components/TaskLabel"
import { typography, useAppTheme, useWebTheme } from '../../../../theme';
import { hsl, webColorTokens } from '../../../../../src/theme/tokens';
import type { Theme } from '../../../../../src/theme/use-theme';
import { translate } from '../../../../i18n';
import TaskStatus from '../../../../components/task-status';
import TimerCard from '../../../../components/timer-card';
import TaskSize from '../../../../components/task-size';
import { RTuseTaskInput } from '../../../../services/hooks/features/use-task-input';
import TaskLabels from '../../../../components/task-labels';
import IssuesModal from '../../../../components/issues-modal';
import { useStores } from '../../../../models';
import { limitTextCharaters } from '../../../../helpers/sub-text';

/** At rest the field shows the start of the task's title: Android scrolls a title longer than the field to its end. */
function restingSelectionOf(editMode: boolean) {
	if (editMode) {
		return undefined;
	}
	return { start: 0, end: 0 };
}

/**
 * At rest the title shows over the field, cut with an ellipsis at its width, and the input under it is hidden: it still
 * takes the tap that starts editing. A transparent text color would not hide it, the new architecture reads it as none.
 */
function restingInputStyleOf(showsRestingTitle: boolean) {
	if (showsRestingTitle) {
		return { opacity: 0 };
	}
	return null;
}

const RUNNING_FILL_ALPHA = 0.06;
const RUNNING_EDGE_ALPHA = 0.3;

/** The panel on the card surface, tinted with the primary color while the timer runs: the running state shows here. */
function panelColorsOf(theme: Theme, running: boolean) {
	if (running) {
		const primary = webColorTokens[theme.scheme].primary;
		return { backgroundColor: hsl(primary, RUNNING_FILL_ALPHA), borderColor: hsl(primary, RUNNING_EDGE_ALPHA) };
	}
	return { backgroundColor: theme.colors.card, borderColor: theme.colors.border };
}

const TimerTaskSection = observer(
	({ taskInput, outsideClick }: { taskInput: RTuseTaskInput; outsideClick: () => unknown }) => {
		const { colors } = useAppTheme();
		const theme = useWebTheme();
		const {
			setEditMode,
			setQuery,
			activeTask,
			editMode,
			isModalOpen,
			hasCreateForm,
			handleTaskCreation,
			createLoading
		} = taskInput;

		const [combxShow, setCombxShow] = useState<boolean>(false);
		const inputRef = useRef<TextInput>(null);
		const {
			TimerStore: { localTimerStatus }
		} = useStores();

		const closeCombox = useCallback(() => {
			setCombxShow(false);
		}, [setCombxShow]);

		useEffect(() => {
			if (isModalOpen || editMode) {
				setCombxShow(true);
			} else {
				setCombxShow(false);
			}
		}, [isModalOpen, editMode]);

		useEffect(() => {
			if (!editMode) {
				inputRef.current?.blur();
			}
		}, [editMode]);

		const showsRestingTitle = !editMode && Boolean(activeTask?.title);

		// The title shown at rest takes the tap that opens the picker: the input under it is hidden, and iOS gives a
		// fully transparent view no touches. While the timer runs the field stays closed, as before.
		const openTaskPicker = () => {
			if (localTimerStatus.running) {
				return;
			}
			setEditMode(true);
			inputRef.current?.focus();
		};

		return (
			<TouchableWithoutFeedback onPress={() => outsideClick()}>
				<View testID="work-panel" style={[$timerSection, panelColorsOf(theme, localTimerStatus.running)]}>
					<View
						style={[
							styles.wrapInput,
							{
								flexDirection: 'row',
								alignItems: 'center',
								borderColor: theme.colors.input,
								backgroundColor: theme.colors.card
							}
						]}
					>
						<IssuesModal task={activeTask} />

						<Text style={[styles.taskNumberStyle, { color: theme.colors['muted-foreground'] }]}>
							{!editMode && activeTask ? `#${activeTask.taskNumber} ` : ''}
						</Text>
						<View testID="task-picker-slot" style={styles.titleSlot}>
							<TextInput
								ref={inputRef}
								selection={restingSelectionOf(editMode)}
								testID="task-picker-field"
								selectionColor={colors.primary}
								placeholderTextColor={colors.tertiary}
								style={[
									styles.textInput,
									{
										backgroundColor: theme.colors.card,
										color: theme.colors.foreground
									},
									restingInputStyleOf(showsRestingTitle)
								]}
								placeholder={translate('myWorkScreen.taskFieldPlaceholder')}
								defaultValue={
									activeTask
										? Platform.OS === 'android'
											? limitTextCharaters({ text: activeTask.title, numChars: 25 })
											: activeTask.title
										: ''
								}
								autoFocus={false}
								autoCapitalize="none"
								autoCorrect={false}
								editable={!localTimerStatus.running}
								onFocus={() => setEditMode(true)}
								// onBlur={() => setEditMode(false)}
								onChangeText={(newText) => setQuery(newText)}
							/>
							{showsRestingTitle && (
								<Pressable
									testID="task-picker-title"
									accessibilityRole="button"
									accessibilityLabel={activeTask?.title}
									accessibilityState={{ disabled: localTimerStatus.running }}
									disabled={localTimerStatus.running}
									style={styles.restingTitle}
									onPress={openTaskPicker}
								>
									<Text
										numberOfLines={1}
										style={[styles.restingTitleText, { color: theme.colors.foreground }]}
									>
										{activeTask?.title}
									</Text>
								</Pressable>
							)}
						</View>
						{hasCreateForm && editMode && !createLoading ? (
							<Pressable
								onPress={() => {
									handleTaskCreation();
									setEditMode(false);
								}}
							>
								<Feather name="check" size={24} color="green" />
							</Pressable>
						) : null}

						{createLoading ? <ActivityIndicator color={colors.primary} style={styles.loading} /> : null}
					</View>

					{combxShow ? (
						<ComboBox closeCombo={() => closeCombox()} setEditMode={setEditMode} tasksHandler={taskInput} />
					) : (
						<View>
							<View
								style={{
									width: '100%',
									flexDirection: 'row',
									marginVertical: 20,
									justifyContent: 'space-between',
									alignItems: 'center'
								}}
							>
								{/* The label sits above the estimate, so both fit the column beside the size on a small phone */}
								<View
									testID="work-estimate"
									style={{
										flexDirection: 'column',
										alignItems: 'flex-start',
										gap: 2,
										width: width / 2.7
									}}
								>
									<Text
										style={{
											fontSize: 12,
											color: colors.tertiary
										}}
									>
										{translate('myWorkScreen.estimateLabel')}
									</Text>

									{/* The estimate pushes itself right with an automatic margin, wanted on the team cards; here it
									sits under its label */}
									<View testID="work-estimate-value" style={{ alignSelf: 'flex-start' }}>
										<EstimateTime timerScreen={true} currentTask={activeTask} />
									</View>
								</View>
								<TaskSize
									task={activeTask}
									containerStyle={{
										...styles.sizeContainer,
										borderColor: colors.border
									}}
								/>
							</View>
							<View
								style={{
									flexDirection: 'row',
									width: '100%',
									justifyContent: 'space-between',
									zIndex: 1000
								}}
							>
								<TaskStatus
									task={activeTask}
									containerStyle={{
										...styles.sizeContainer,
										borderColor: colors.border
									}}
								/>

								<TaskPriorities
									task={activeTask}
									containerStyle={{
										...styles.sizeContainer,
										borderColor: colors.border
									}}
								/>
							</View>
							<TaskLabels
								task={activeTask}
								containerStyle={{
									...styles.sizeContainer,
									width: activeTask?.tags?.length ? '100%' : 160,
									borderColor: colors.border,
									marginVertical: 20
								}}
							/>
							<TimerCard />
						</View>
					)}
				</View>
			</TouchableWithoutFeedback>
		);
	}
);
export default TimerTaskSection;

const width = Dimensions.get('window').width;

// The web's card: radius 14, a hairline and its light black shadow
const $timerSection: ViewStyle = {
	marginTop: 20,
	padding: 20,
	marginHorizontal: 20,
	borderRadius: 14,
	borderWidth: StyleSheet.hairlineWidth,
	boxShadow: '0 1px 2px rgba(0, 0, 0, 0.065)'
};

const styles = StyleSheet.create({
	container: {},
	dashed: {
		borderBottomColor: '#fff',
		borderBottomWidth: 10
	},
	estimate: {
		alignSelf: 'flex-end',
		color: '#9490A0',
		fontSize: 12,
		fontWeight: '600',
		marginBottom: 10
	},
	horizontal: {
		flexDirection: 'row',
		justifyContent: 'center',
		marginBottom: 20
	},
	horizontalInput: {
		alignItems: 'flex-end',
		flexDirection: 'row'
	},
	loading: {
		right: 10
	},
	mainContainer: {
		backgroundColor: '#fff',
		borderRadius: 25,
		paddingTop: 30,
		padding: 20,
		...GS.noBorder,
		borderWidth: 1,
		elevation: 5,
		shadowColor: '#1B005D0D',
		shadowOffset: { width: 10, height: 10.5 },
		shadowOpacity: 1,
		shadowRadius: 15
	},
	sizeContainer: {
		alignItems: 'center',
		borderColor: 'rgba(255, 255, 255, 0.13)',
		borderWidth: 1,
		height: 32,
		paddingHorizontal: 9,
		width: width / 2.7
	},
	taskNumberStyle: {
		fontFamily: typography.primary.semiBold,
		fontSize: 13,
		marginLeft: 5
	},
	restingTitle: {
		bottom: 0,
		justifyContent: 'center',
		left: 6,
		position: 'absolute',
		right: 6,
		top: 0
	},
	restingTitleText: {
		fontFamily: typography.fonts.PlusJakartaSans.semiBold,
		fontSize: 14
	},
	textInput: {
		borderRadius: 8,
		fontFamily: typography.fonts.PlusJakartaSans.semiBold,
		fontSize: 14,
		height: 42,
		paddingHorizontal: 6,
		paddingVertical: 0
	},
	// the rest of the row beside the task's number, so a long title stays inside the field
	titleSlot: {
		flex: 1,
		justifyContent: 'center'
	},
	textInputOne: {
		height: 30
	},
	working: {
		color: '#9490A0',
		fontWeight: '600',
		marginBottom: 10
	},
	wrapBugIcon: {
		alignItems: 'center',
		backgroundColor: '#C24A4A',
		borderRadius: 3,
		height: 20,
		justifyContent: 'center',
		width: 20
	},
	// The web's control: 44 tall, radius 8, a hairline in the input color
	wrapInput: {
		borderRadius: 8,
		borderWidth: StyleSheet.hairlineWidth,
		height: 44,
		paddingHorizontal: 16,
		paddingVertical: 2,
		width: '100%'
	}
});
