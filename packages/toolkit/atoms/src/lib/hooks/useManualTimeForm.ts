import { addManualTime } from '@ever-teams/api';
import { ICurrentTeamsState, LogType, TimerSource } from '@ever-teams/toolkit-types';
import { useTeamsContext } from '@lib/context/teams-context';
import { useAccessToken } from './useAccessToken';
import { useState, useEffect, useMemo, useRef } from 'react';
import { toast, reportError, getErrorMessage } from '@ever-teams/toolkit-ui';
import { useTranslation } from 'react-i18next';
import { format, subMinutes, addMinutes, isAfter, startOfDay, isToday as isTodayFns } from 'date-fns';
import { NO_TEAMS_STATE, useForgetOnAccountChange } from './useForgetOnAccountChange';
import { useUserOrganization } from './useUserOrganization';

const roundToNearest5Min = (date: Date): Date => {
	const minutes = date.getMinutes();
	const roundedMinutes = Math.floor(minutes / 5) * 5;
	const result = new Date(date);
	result.setMinutes(roundedMinutes, 0, 0);
	return result;
};

export const useManualTimeForm = () => {
	const { authenticatedUser: user, selectedOrganization } = useTeamsContext();
	const { accessToken: token } = useAccessToken();
	const { t } = useTranslation(undefined, { keyPrefix: 'MANUAL_TIME_FORM' });

	const [date, setDate] = useState<Date>(new Date());

	const initialNow = useMemo(() => roundToNearest5Min(new Date()), []);
	const initialStart = useMemo(() => format(subMinutes(initialNow, 10), 'HH:mm'), [initialNow]);
	const initialEnd = useMemo(() => format(initialNow, 'HH:mm'), [initialNow]);

	const [startTime, setStartTime] = useState<string>(initialStart);
	const [endTime, setEndTime] = useState<string>(initialEnd);
	const [description, setDescription] = useState<string>('');
	const [loading, setLoading] = useState(false);
	const [errors, setErrors] = useState<string[]>([]);
	const [isBillable, setIsBillable] = useState<boolean>(true);

	const [currentTeamsState, setCurrentTeamsState] = useState<ICurrentTeamsState>(NO_TEAMS_STATE);

	// Which account the form works for: a submission that comes back after the account changed belongs to the previous
	// one, and leaves the new account's form as it is.
	const accountGeneration = useRef(0);

	// Another account starts from a new form: after a sign-out that keeps the form mounted, what the previous account
	// picked, typed or set (its day and hours too) would otherwise go out with the next account's time.
	useForgetOnAccountChange(() => {
		accountGeneration.current += 1;
		const now = roundToNearest5Min(new Date());
		setDate(new Date());
		setStartTime(format(subMinutes(now, 10), 'HH:mm'));
		setEndTime(format(now, 'HH:mm'));
		setCurrentTeamsState(NO_TEAMS_STATE);
		setDescription('');
		setIsBillable(true);
		setErrors([]);
		setLoading(false);
	});

	const { data: userOrganizations } = useUserOrganization(user, token);

	const isManualTimeEnabled = userOrganizations?.items.find((elt) => elt.organizationId == selectedOrganization)
		?.organization?.allowManualTime;

	const isToday = isTodayFns(date);

	const nowTimeRounded = useMemo(() => {
		return format(roundToNearest5Min(new Date()), 'HH:mm');
	}, [date]); // Re-calculate when date changes to stay fresh

	// Validation for start time and end time
	useEffect(() => {
		if (isToday) {
			const tenMinutesBeforeNow = format(subMinutes(roundToNearest5Min(new Date()), 10), 'HH:mm');

			// If current startTime is after limit, reset it
			if (startTime > tenMinutesBeforeNow) {
				setStartTime(tenMinutesBeforeNow);
				setEndTime(format(roundToNearest5Min(new Date()), 'HH:mm'));
			}
		}
	}, [date, isToday]);

	const handleTimeChange = (type: 'start' | 'end', value: string) => {
		setErrors([]);
		if (type === 'start') {
			setStartTime(value);

			// Ensure end time is at least 10 minutes after start time
			const [h, m] = value.split(':').map(Number);
			const startDate = new Date();
			startDate.setHours(h, m, 0, 0);
			const minEnd = addMinutes(startDate, 10);
			const minEndStr = format(minEnd, 'HH:mm');

			if (endTime < minEndStr) {
				setEndTime(minEndStr);
			}
		} else {
			setEndTime(value);
		}
	};

	const handleSubmit = async (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		setLoading(true);
		setErrors([]);

		if (!user || !selectedOrganization) {
			setErrors([t('auth_org_missing')]);
			setLoading(false);
			return;
		}

		const [startH, startM] = startTime.split(':').map(Number);
		const [endH, endM] = endTime.split(':').map(Number);

		const startedAt = startOfDay(date);
		startedAt.setHours(startH, startM, 0, 0);

		const stoppedAt = startOfDay(date);
		stoppedAt.setHours(endH, endM, 0, 0);

		if (isAfter(startedAt, stoppedAt)) {
			setErrors([t('error_start_after_end')]);
			setLoading(false);
			return;
		}

		const body = {
			startedAt: startedAt.toISOString(),
			stoppedAt: stoppedAt.toISOString(),
			projectId: currentTeamsState.projectId || undefined,
			taskId: currentTeamsState.taskId || undefined,
			organizationTeamId: currentTeamsState.organizationTeamId || undefined,
			organizationContactId: currentTeamsState.clientId || undefined,
			organizationId: selectedOrganization,
			tenantId: user.tenantId,
			employeeId: user.employee.id,
			description,
			isBillable,
			logType: LogType.MANUAL,
			source: TimerSource.TEAMS
		};

		const generation = accountGeneration.current;
		const isForPreviousAccount = () => generation !== accountGeneration.current;
		try {
			const result = await addManualTime({ token, body });
			if (isForPreviousAccount()) {
				return;
			}

			if ('message' in result || 'error' in result) {
				const msg =
					'message' in result
						? Array.isArray(result.message)
							? result.message.join(', ')
							: result.message
						: String(result.error);
				setErrors([msg]);
				setLoading(false);
				return;
			}

			toast({
				title: t('success_title'),
				description: t('success_description'),
				variant: 'default'
			});

			// Reset form
			setDescription('');
		} catch (error) {
			const errorMessage = getErrorMessage(error);
			reportError(errorMessage);
			if (!isForPreviousAccount()) {
				setErrors([errorMessage]);
			}
		} finally {
			if (!isForPreviousAccount()) {
				setLoading(false);
			}
		}
	};

	return {
		date,
		setDate,
		startTime,
		endTime,
		isBillable,
		setIsBillable,
		handleTimeChange,
		description,
		setDescription,
		currentTeamsState,
		setCurrentTeamsState,
		loading,
		errors,
		handleSubmit,
		isManualTimeEnabled,
		isToday,
		nowTimeRounded
	};
};
