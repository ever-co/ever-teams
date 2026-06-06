'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
	Accordion,
	AccordionItem,
	AccordionTrigger,
	AccordionContent,
	Input,
	ThemedButton,
	Button,
	cn
} from '@ever-teams/toolkit-ui';
import { Building2, Calendar, ListFilter, Loader2, TimerIcon, Users, Info, Download, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTrackingContext } from '@lib/context/teams-tracking-context';
import { TeamsActiveEmployeeSelector } from '@components/teams-ui-components/inputs/teams-active-employee-selector';
import { TeamsActiveOrganizationSelector } from '@components/teams-ui-components/inputs/teams-active-organization-selector';
import { useTeamsContext } from '@lib/context/teams-context';
import moment from 'moment-timezone';
import { PermissionsEnum } from '@ever-teams/toolkit-types';
import { getUserTimezone } from '@lib/utils/time-zone';

/**
 * Formats time for HTML time input (HH:MM format)
 */
const formatTimeForInput = (date: Date, timezone: string): string => {
	try {
		const momentInTimezone = moment.tz(date, timezone);
		return momentInTimezone.format('HH:mm');
	} catch (error) {
		console.warn(`Failed to format time for input:`, error);
		return date.toTimeString().slice(0, 5);
	}
};

/**
 * Global Tracking Filter Component
 * Provides unified filter controls for tracking components with timezone awareness
 */
interface ITrackingFilterProps {
	className?: string;
	autoRefresh?: boolean;
	refreshInterval?: number;
}

export const TeamsTrackingFilter: React.FC<ITrackingFilterProps> = ({
	className = '',
	autoRefresh = false,
	refreshInterval = 30000 // 30 seconds
}) => {
	const { t } = useTranslation(undefined, { keyPrefix: 'TEAMS_TRACKING_FILTER' });
	const { formData, setFormData, sessions, loading, error, fetchSessions } = useTrackingContext();
	const { authenticatedUser: user, userPermissions } = useTeamsContext();
	const [isAllowedToChangeEmployee, setIsAllowedToChangeEmployee] = useState<boolean>(false);

	// Get user's timezone with fallback priority
	const userTimezone = useMemo(() => getUserTimezone(user?.timeZone), [user?.timeZone]);

	// Derive the current date from formData.from for the date picker
	const currentDate = useMemo(() => {
		try {
			// Convert the formData.from date to user's timezone for display
			const momentInTimezone = moment.tz(formData.from, userTimezone);
			return momentInTimezone.format('YYYY-MM-DD');
		} catch (error) {
			console.warn('Failed to format date for picker:', error);
			return new Date().toISOString().split('T')[0];
		}
	}, [formData.from, userTimezone]);

	// Validate that start time is before end time
	const isTimeRangeValid = useMemo(() => {
		try {
			return formData.from < formData.to;
		} catch (error) {
			console.warn('Error validating time range:', error);
			return true; // Default to valid to avoid blocking UI
		}
	}, [formData.from, formData.to]);

	const handleDateChange = (newDate: Date) => {
		setFormData((prev) => {
			try {
				// Get current times in user's timezone
				const fromMoment = moment.tz(prev.from, userTimezone);
				const toMoment = moment.tz(prev.to, userTimezone);

				// Create new date moments in user's timezone with preserved times
				const newFromMoment = moment
					.tz(newDate, userTimezone)
					.hour(fromMoment.hour())
					.minute(fromMoment.minute())
					.second(0)
					.millisecond(0);

				const newToMoment = moment
					.tz(newDate, userTimezone)
					.hour(toMoment.hour())
					.minute(toMoment.minute())
					.second(0)
					.millisecond(0);

				return {
					...prev,
					from: newFromMoment.toDate(),
					to: newToMoment.toDate()
				};
			} catch (error) {
				console.warn('Failed to handle date change:', error);
				// Fallback to original logic
				const fromHours = prev.from.getHours();
				const fromMinutes = prev.from.getMinutes();
				const toHours = prev.to.getHours();
				const toMinutes = prev.to.getMinutes();

				const newFromDate = new Date(newDate);
				newFromDate.setHours(fromHours, fromMinutes, 0, 0);

				const newToDate = new Date(newDate);
				newToDate.setHours(toHours, toMinutes, 0, 0);

				return {
					...prev,
					from: newFromDate,
					to: newToDate
				};
			}
		});
	};

	const handleFromTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const timeParts = e.target.value.split(':');
		if (timeParts.length !== 2) return;
		const [hours, minutes] = timeParts.map(Number);
		if (isNaN(hours) || isNaN(minutes)) {
			return;
		}
		setFormData((prev) => {
			try {
				// Create a new moment in user's timezone with the selected time
				const fromMoment = moment.tz(prev.from, userTimezone);
				const newFromMoment = fromMoment.clone().hour(hours).minute(minutes).second(0).millisecond(0);

				return {
					...prev,
					from: newFromMoment.toDate()
				};
			} catch (error) {
				console.warn('Failed to handle from time change:', error);
				// Fallback to original logic
				const newFromDate = new Date(prev.from);
				newFromDate.setHours(hours, minutes, 0, 0);

				return {
					...prev,
					from: newFromDate
				};
			}
		});
	};

	const handleToTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const timeParts = e.target.value.split(':');
		if (timeParts.length !== 2) return;
		const [hours, minutes] = timeParts.map(Number);
		if (isNaN(hours) || isNaN(minutes)) {
			return;
		}

		setFormData((prev) => {
			try {
				// Create a new moment in user's timezone with the selected time
				const toMoment = moment.tz(prev.to, userTimezone);
				const newToMoment = toMoment.clone().hour(hours).minute(minutes).second(0).millisecond(0);

				return {
					...prev,
					to: newToMoment.toDate()
				};
			} catch (error) {
				console.warn('Failed to handle to time change:', error);
				// Fallback to original logic
				const newToDate = new Date(prev.to);
				newToDate.setHours(hours, minutes, 0, 0);

				return {
					...prev,
					to: newToDate
				};
			}
		});
	};

	// Manual refresh handler
	const handleManualRefresh = async () => {
		try {
			await fetchSessions();
		} catch (error) {
			console.error('Manual refresh failed:', error);
		}
	};

	// Export analytics data (placeholder for future implementation)
	const handleExportData = () => {
		// TODO: Implement data export functionality
	};

	// Auto-refresh functionality
	useEffect(() => {
		if (!autoRefresh) return;

		const interval = setInterval(async () => {
			try {
				await fetchSessions();
			} catch (error) {
				console.error('Auto-refresh failed:', error);
			}
		}, refreshInterval);

		return () => clearInterval(interval);
	}, [autoRefresh, refreshInterval, fetchSessions]);

	useEffect(() => {
		if (userPermissions) {
			const allowed = userPermissions.filter((elt) => elt.permission == PermissionsEnum.CHANGE_SELECTED_EMPLOYEE);
			if (allowed[0]) setIsAllowedToChangeEmployee(true);
		} else {
			setIsAllowedToChangeEmployee(false);
		}
	}, [userPermissions, user]);

	return (
		<div
			className={`mb-4 rounded-xl border border-gray-200 dark:border-gray-700 p-5 bg-white dark:bg-black ${className}`}
		>
			<Accordion className="w-full text-sm mb-4 rounded-lg" type="multiple">
				<AccordionItem value="filter">
					<AccordionTrigger className="py-0">
						<div className="flex gap-2 justify-start items-center text-gray-900 dark:text-white">
							<ListFilter size={15} className="text-gray-400" />
							<h2 className="text-base font-semibold">{t('title')}</h2>
						</div>
					</AccordionTrigger>
					<AccordionContent className="p-0 w-full">
						<div className="flex flex-col lg:flex-row w-full gap-4 my-3">
							<div className="w-full">
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
									<Building2 className="inline h-4 w-4 mr-1" />
									{t('labels.organization')}
								</label>
								<TeamsActiveOrganizationSelector />
							</div>
							{isAllowedToChangeEmployee && (
								<div className="w-full">
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
										<Users className="inline h-4 w-4 mr-1" />
										{t('labels.employee')}
									</label>
									<TeamsActiveEmployeeSelector className="w-full" />
								</div>
							)}
							<div className="w-full">
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
									<Calendar className="inline h-4 w-4 mr-1" />
									{t('labels.date')}
								</label>

								{/* TO DO: To be replaced with a datepicker from @ever-teams/toolkit-ui */}
								<Input
									type="date"
									className="w-full"
									value={currentDate}
									onChange={(e) => {
										handleDateChange(new Date(e.target.value));
									}}
								/>
							</div>

							<div className="w-full">
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
									<TimerIcon className="inline h-4 w-4 mr-1" />
									{t('labels.time_range')} ({userTimezone})
								</label>
								<div className="flex w-full gap-2 items-center">
									<Input
										type="time"
										value={formatTimeForInput(formData.from, userTimezone)}
										onChange={handleFromTimeChange}
										className="w-full"
										title={`Start time in ${userTimezone}`}
									/>
									<span className="hidden sm:block"> - </span>
									<Input
										type="time"
										value={formatTimeForInput(formData.to, userTimezone)}
										onChange={handleToTimeChange}
										className="w-full"
										title={`End time in ${userTimezone}`}
									/>
								</div>
							</div>
						</div>

						{/* Timezone and validation information */}
						<div className="my-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
							<div className="flex items-center justify-between text-xs">
								<div className="flex items-center gap-2">
									<Info size={12} className="text-blue-500" />
									<span className="text-gray-600 dark:text-gray-400">
										Timezone:{' '}
										<span className="font-medium text-blue-600 dark:text-blue-400">
											{userTimezone}
										</span>
									</span>
								</div>
								{!isTimeRangeValid && (
									<div className="flex items-center gap-1 text-red-600 dark:text-red-400">
										<span className="w-2 h-2 bg-red-500 rounded-full"></span>
										<span>Start time must be before end time</span>
									</div>
								)}
							</div>
						</div>

						<ThemedButton onClick={fetchSessions} disabled={loading || !isTimeRangeValid}>
							{loading && <Loader2 className="animate-spin size-4 mr-2" />} {t('actions.apply_filter')}
						</ThemedButton>
					</AccordionContent>
				</AccordionItem>
			</Accordion>

			{/* Results Summary */}
			<div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Info size={14} className="text-gray-400" />
						<span className="text-xs text-gray-600 dark:text-gray-400">Results:</span>
						{loading && <Loader2 className="animate-spin h-3 w-3 text-gray-400" />}
						<span className="text-xs font-semibold text-gray-900 dark:text-white" aria-live="polite">
							{loading
								? t('results.loading')
								: error
									? t('results.error_occurred')
									: !sessions || sessions.length === 0
										? t('results.no_session_found')
										: sessions.length === 1
											? t('results.sessions_found', { count: sessions.length })
											: t('results.sessions_found_plural', { count: sessions.length })}
						</span>
					</div>

					<div className="flex items-center gap-2">
						{/* Auto-refresh indicator */}
						{autoRefresh && (
							<div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
								<div
									className={cn(
										'w-2 h-2 rounded-full',
										loading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'
									)}
								/>
								{t('results.auto_refresh')}
							</div>
						)}

						{/* Manual refresh button */}
						<Button onClick={handleManualRefresh} variant="outline" size="sm" disabled={loading}>
							{loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
							{t('actions.refresh')}
						</Button>

						{/* Export button */}
						<Button onClick={handleExportData} variant="outline" size="sm">
							<Download size={16} />
							{t('actions.export')}
						</Button>
					</div>
				</div>
				{error && (
					<div
						className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-200 dark:border-red-800"
						role="alert"
					>
						{error}
					</div>
				)}
			</div>
		</div>
	);
};

export default TeamsTrackingFilter;
