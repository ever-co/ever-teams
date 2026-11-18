import React, { FC, useEffect, useRef, useState } from 'react';
import {
	ActivityIndicator,
	KeyboardTypeOptions,
	Platform,
	StyleSheet,
	Text,
	TouchableOpacity,
	View
} from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { showMessage } from 'react-native-flash-message';
import type { TxKeyPath } from '../i18n/i18n';
import { translate } from '../i18n';
import {
	timeTextFromTyping,
	TIMER_START_REASON_MAX_LENGTH,
	TimerStartMoveAccess,
	TimerStartViewReason,
	daysOfRun,
	isSameStartMinute,
	localStartMoveRefusalKeyOf,
	startOnDay,
	timeTextOf,
	timerStartMoveRefusalKeyOf
} from '../helpers/timer-start-move';
import type { ITimerStartMoveFailure } from '../services/hooks/use-timer-start-move';
import { typography, useAppTheme } from '../theme';

/** The line that says why the panel shows the start alone. */
const VIEW_KEYS: Readonly<Record<TimerStartViewReason, TxKeyPath>> = {
	checking: 'timer.startMove.checking',
	tracker: 'timer.startMove.viewTracker',
	'not-allowed': 'timer.startMove.viewNotAllowed',
	unsupported: 'timer.startMove.unsupported'
};

const ERROR_COLOR = '#DA5E5E';
const FIELD_BORDER_COLOR = '#DCE4E8';
const PLACEHOLDER_COLOR = '#7B8089';
const CANCEL_BACKGROUND = '#E6E6E9';
const CANCEL_TEXT_COLOR = '#1A1C1E';
const SAVE_TEXT_COLOR = '#FFF';
const ACCENT_LIGHT = '#3826A6';
const ACCENT_DARK = '#6755C9';
/** A day of the run as its choice shows it, in the phone's language: `Sun 15 Nov`. */
const DAY_FORMAT: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };
/** The Save button while the save is under way. */
const SAVING_OPACITY = 0.7;

interface ITimerStartPanelProps {
	access: TimerStartMoveAccess;
	/** When the running timer's run started, in milliseconds; null once no timer runs. */
	runStart: number | null;
	saving: boolean;
	/** Moves the start; throws an `ITimerStartMoveFailure` when it did not happen. */
	onSave: (move: { startedAt: Date; reason?: string }) => Promise<void>;
	onClose: () => void;
}

/**
 * The panel of the running time (ever-co/ever-teams#5373): when the run started and, where the person may change it,
 * a time field to move the start (with the day of the new start for a run that started before midnight, never guessed),
 * and the reason the organization may ask for. A start later than now, an earlier start where time may not be added
 * by hand, and a missing reason are told before anything is sent; the API's refusals, a failed save and an offline
 * phone are told after.
 */
// iOS has a keyboard of digits and a colon; Android shows the digits, and the field places the colon
function timeKeyboard(): KeyboardTypeOptions {
	if (Platform.OS === 'ios') {
		return 'numbers-and-punctuation';
	}
	return 'number-pad';
}

export const TimerStartPanel: FC<ITimerStartPanelProps> = ({ access, runStart, saving, onSave, onClose }) => {
	const { colors, dark } = useAppTheme();
	const [timeText, setTimeText] = useState(() => (runStart === null ? '' : timeTextOf(new Date(runStart))));
	const [reason, setReason] = useState('');
	const [errorKey, setErrorKey] = useState<TxKeyPath | null>(null);
	// The day of the new start the person chose, at its local midnight, when the run spans more than one day
	const [chosenDay, setChosenDay] = useState<number | null>(null);
	// Whether the person typed a time since the field last showed the run's start
	const typedTime = useRef(false);
	const shownRunStart = useRef(runStart);

	// A status read brings a start moved elsewhere: the field shows it, so Save never writes the old start back, and
	// a time the person had typed is dropped with a word that the start changed
	useEffect(() => {
		const startMoved = shownRunStart.current !== runStart;
		if (!startMoved) {
			return;
		}
		shownRunStart.current = runStart;
		if (runStart === null) {
			return;
		}
		setTimeText(timeTextOf(new Date(runStart)));
		setChosenDay(null);
		if (typedTime.current) {
			setErrorKey('timer.startMove.changed');
		}
		typedTime.current = false;
	}, [runStart]);

	const isRunning = runStart !== null;
	const isEditable = isRunning && access.kind === 'edit';
	// A run that started before midnight spans more than one day: the person says which day the new start is on
	const runDays = isRunning ? daysOfRun(new Date(runStart), new Date()) : [];
	const asksForDay = runDays.length > 1;
	const startedAtText = isRunning
		? translate('timer.startMove.startedAt', { time: timeTextOf(new Date(runStart)) })
		: '';
	const accentColor = dark ? ACCENT_DARK : ACCENT_LIGHT;
	const saveOpacity = saving ? SAVING_OPACITY : 1;

	const save = async () => {
		const cannotSave = runStart === null || access.kind !== 'edit' || saving;
		if (cannotSave) {
			return;
		}
		const now = new Date();
		const runStartDate = new Date(runStart);
		const days = daysOfRun(runStartDate, now);
		const day = days.length === 1 ? days[0] : days.find((candidate) => candidate.getTime() === chosenDay);
		// Read on the run's day until a day is chosen, to tell a field that still shows the start
		const start = startOnDay(day ?? days[0], timeText);
		if (!start) {
			setErrorKey('timer.startMove.invalidTime');
			return;
		}
		// The minute the run started: nothing to change
		if (isSameStartMinute(start, runStartDate)) {
			onClose();
			return;
		}
		if (!day) {
			setErrorKey('timer.startMove.chooseDay');
			return;
		}
		const localRefusal = localStartMoveRefusalKeyOf({
			start,
			runStart: runStartDate,
			now,
			earlierAllowed: access.earlierAllowed,
			reasonRequired: access.reasonRequired,
			reason
		});
		if (localRefusal) {
			setErrorKey(localRefusal);
			return;
		}
		setErrorKey(null);
		try {
			await onSave({ startedAt: start, reason });
			showMessage({ message: translate('timer.startMove.saved', { time: timeTextOf(start) }), type: 'success' });
			onClose();
		} catch (failure) {
			setErrorKey(timerStartMoveRefusalKeyOf(failure as ITimerStartMoveFailure));
		}
	};

	const changeTime = (text: string) => {
		typedTime.current = true;
		setTimeText(timeTextFromTyping(text));
		setErrorKey(null);
	};

	const chooseDay = (day: number) => {
		setChosenDay(day);
		setErrorKey(null);
	};

	const changeReason = (text: string) => {
		setReason(text);
		setErrorKey(null);
	};

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]} testID="timer-start-panel">
			<Text style={[styles.title, { color: colors.primary }]}>{translate('timer.startMove.title')}</Text>
			{isRunning ? (
				<Text style={[styles.startedAt, { color: colors.primary }]}>{startedAtText}</Text>
			) : (
				<Text style={[styles.note, { color: colors.tertiary }]}>{translate('timer.startMove.notRunning')}</Text>
			)}

			{isRunning && access.kind === 'view' ? (
				<View style={styles.viewLine}>
					{access.why === 'checking' ? <ActivityIndicator size="small" color={accentColor} /> : null}
					<Text style={[styles.note, { color: colors.tertiary }]}>{translate(VIEW_KEYS[access.why])}</Text>
				</View>
			) : null}

			{isEditable ? (
				<View>
					<Text style={[styles.label, { color: colors.primary }]}>
						{translate('timer.startMove.newStart')}
					</Text>
					{asksForDay ? (
						<View style={styles.days} accessibilityRole="radiogroup">
							{runDays.map((day, index) => {
								const isChosen = day.getTime() === chosenDay;
								const dayTextColor = isChosen ? SAVE_TEXT_COLOR : colors.primary;
								return (
									<TouchableOpacity
										key={day.getTime()}
										testID={`timer-start-day-${index}`}
										style={[
											styles.day,
											{ borderColor: isChosen ? accentColor : FIELD_BORDER_COLOR },
											isChosen ? { backgroundColor: accentColor } : null
										]}
										onPress={() => chooseDay(day.getTime())}
										disabled={saving}
										accessibilityRole="radio"
										accessibilityState={{ checked: isChosen, disabled: saving }}
									>
										<Text style={[styles.dayText, { color: dayTextColor }]}>
											{day.toLocaleDateString(undefined, DAY_FORMAT)}
										</Text>
									</TouchableOpacity>
								);
							})}
						</View>
					) : null}
					<BottomSheetTextInput
						testID="timer-start-time"
						style={[styles.input, { color: colors.primary, borderColor: FIELD_BORDER_COLOR }]}
						value={timeText}
						onChangeText={changeTime}
						placeholder={translate('timer.startMove.timePlaceholder')}
						placeholderTextColor={PLACEHOLDER_COLOR}
						keyboardType={timeKeyboard()}
						maxLength={5}
						editable={!saving}
						autoCorrect={false}
						accessibilityLabel={translate('timer.startMove.newStart')}
					/>
					{access.earlierAllowed ? null : (
						<Text style={[styles.note, { color: colors.tertiary }]}>
							{translate('timer.startMove.laterOnly')}
						</Text>
					)}
					{access.reasonRequired ? (
						<>
							<Text style={[styles.label, { color: colors.primary }]}>
								{translate('timer.startMove.reason')}
							</Text>
							<BottomSheetTextInput
								testID="timer-start-reason"
								style={[styles.input, { color: colors.primary, borderColor: FIELD_BORDER_COLOR }]}
								value={reason}
								onChangeText={changeReason}
								placeholder={translate('timer.startMove.reasonPlaceholder')}
								placeholderTextColor={PLACEHOLDER_COLOR}
								maxLength={TIMER_START_REASON_MAX_LENGTH}
								editable={!saving}
								accessibilityLabel={translate('timer.startMove.reason')}
							/>
						</>
					) : null}
				</View>
			) : null}

			{errorKey ? (
				<Text style={styles.error} accessibilityLiveRegion="polite" testID="timer-start-error">
					{translate(errorKey)}
				</Text>
			) : null}

			<View style={styles.buttons}>
				<TouchableOpacity
					testID="timer-start-cancel"
					style={styles.cancelButton}
					onPress={onClose}
					accessibilityRole="button"
				>
					<Text style={styles.cancelText}>
						{isEditable ? translate('common.cancel') : translate('timer.startMove.close')}
					</Text>
				</TouchableOpacity>
				{isEditable ? (
					<TouchableOpacity
						testID="timer-start-save"
						style={[styles.saveButton, { backgroundColor: accentColor, opacity: saveOpacity }]}
						onPress={save}
						disabled={saving}
						accessibilityRole="button"
						accessibilityState={{ busy: saving, disabled: saving }}
					>
						{saving ? (
							<ActivityIndicator style={styles.spinner} size="small" color={SAVE_TEXT_COLOR} />
						) : null}
						<Text style={styles.saveText}>
							{saving ? translate('timer.startMove.saving') : translate('timer.startMove.save')}
						</Text>
					</TouchableOpacity>
				) : null}
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	buttons: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 24,
		width: '100%'
	},
	cancelButton: {
		alignItems: 'center',
		backgroundColor: CANCEL_BACKGROUND,
		borderRadius: 12,
		height: 52,
		justifyContent: 'center',
		width: '48%'
	},
	cancelText: {
		color: CANCEL_TEXT_COLOR,
		fontFamily: typography.primary.semiBold,
		fontSize: 16
	},
	container: {
		paddingBottom: 32,
		paddingHorizontal: 24,
		paddingTop: 8
	},
	day: {
		borderRadius: 12,
		borderWidth: 1,
		height: 40,
		justifyContent: 'center',
		paddingHorizontal: 14
	},
	dayText: {
		fontFamily: typography.primary.medium,
		fontSize: 14
	},
	days: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		marginTop: 8
	},
	error: {
		color: ERROR_COLOR,
		fontFamily: typography.primary.medium,
		fontSize: 13,
		marginTop: 12
	},
	input: {
		borderRadius: 12,
		borderWidth: 1,
		fontFamily: typography.primary.medium,
		fontSize: 16,
		height: 52,
		marginTop: 8,
		paddingHorizontal: 16,
		width: '100%'
	},
	label: {
		fontFamily: typography.primary.semiBold,
		fontSize: 14,
		marginTop: 16
	},
	note: {
		flexShrink: 1,
		fontFamily: typography.primary.medium,
		fontSize: 13,
		marginTop: 8
	},
	saveButton: {
		alignItems: 'center',
		borderRadius: 12,
		flexDirection: 'row',
		height: 52,
		justifyContent: 'center',
		width: '48%'
	},
	saveText: {
		color: SAVE_TEXT_COLOR,
		fontFamily: typography.primary.semiBold,
		fontSize: 16
	},
	spinner: {
		marginRight: 8
	},
	startedAt: {
		fontFamily: typography.primary.medium,
		fontSize: 16,
		marginTop: 6
	},
	title: {
		fontFamily: typography.primary.semiBold,
		fontSize: 20
	},
	viewLine: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 8
	}
});

export default TimerStartPanel;
