'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LogType, TimerSource } from '@ever-teams/toolkit-types';
import { useTeamsContext } from '@lib/context/teams-context';
import { DateRange } from 'react-day-picker';
import {
	Avatar,
	Badge,
	Button,
	cn,
	DatePicker,
	MultiSelect,
	MultiSelectContent,
	MultiSelectGroup,
	MultiSelectItem,
	MultiSelectTrigger,
	MultiSelectValue,
	Select,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@ever-teams/toolkit-ui';
import { SpinOverlayLoader } from '@components/loaders/spin-overlay-loader';
import { TeamsTimerFooter } from '@components/layouts/footers/component-footer';
import { ChevronLeft, ChevronRight, FileText, RefreshCwIcon } from 'lucide-react';
import { TeamsActiveEmployeeSelector } from '@components/teams-ui-components/inputs/teams-active-employee-selector';
import { useTimeLogs } from '@hooks/useTimeLogs';

/**
 * Format duration in seconds to HH:MM:SS format (e.g., "01:05:40")
 */
const formatDuration = (durationInSeconds: number): string => {
	if (!durationInSeconds || durationInSeconds < 0) return '00:00:00';

	const hours = Math.floor(durationInSeconds / 3600);
	const minutes = Math.floor((durationInSeconds % 3600) / 60);
	const seconds = Math.floor(durationInSeconds % 60);

	const pad = (num: number): string => String(num).padStart(2, '0');

	return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

/**
 * Format a date string to time format with seconds (e.g., "09:00:00 AM")
 */
const formatTime = (dateString: string): string => {
	if (!dateString) return '-';
	try {
		const date = new Date(dateString);
		return date.toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: true
		});
	} catch {
		return '-';
	}
};

/**
 * Format time span from start to end (e.g., "09:00 AM - 11:30 AM")
 */
const formatTimeSpan = (startedAt: string, stoppedAt: string): string => {
	const start = formatTime(startedAt);
	const end = formatTime(stoppedAt);
	return `${start} - ${end}`;
};

/**
 * Get badge variant based on log type
 */
const getLogTypeBadgeVariant = (logType: LogType): 'default' | 'secondary' | 'destructive' | 'outline' => {
	switch (logType?.toUpperCase()) {
		case 'TRACKED':
			return 'default';
		case 'MANUAL':
			return 'secondary';
		case 'IDLE':
			return 'destructive';
		case 'RESUMED':
			return 'outline';
		default:
			return 'secondary';
	}
};

/**
 * Get badge variant based on source
 */
const getSourceBadgeVariant = (source: TimerSource): 'default' | 'secondary' | 'destructive' | 'outline' => {
	switch (source?.toUpperCase()) {
		case 'TEAMS':
			return 'default';
		case 'DESKTOP':
			return 'secondary';
		case 'MOBILE':
			return 'outline';
		case 'BROWSER':
			return 'secondary';
		case 'BROWSER_EXTENSION':
			return 'secondary';
		case 'HUBSTAFF':
			return 'secondary';
		case 'UPWORK':
			return 'secondary';
		case 'TEAMS':
			return 'secondary';
		default:
			return 'outline';
	}
};

// Filter options for Source and Log Type (using enum values for type safety)
const SOURCE_OPTIONS: TimerSource[] = Object.values(TimerSource);
const LOG_TYPE_OPTIONS: LogType[] = Object.values(LogType);

interface TeamsTimesheetProps {
	className?: string;
	date?: DateRange;
	activityLevel?: { start: number; end: number };
	timeZone?: string;
	showEmployee?: boolean;
}

export const TeamsTimesheet = ({
	className,
	date: initialDate,
	activityLevel,
	timeZone,
	showEmployee = false
}: TeamsTimesheetProps) => {
	const { t } = useTranslation(undefined, { keyPrefix: 'TIMESHEET' });

	const { userOrganizations, selectedOrganization } = useTeamsContext();

	// Date filter state - default to today
	const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDate?.from ?? new Date());

	// Filter state - using enum types for type safety
	const [selectedSources, setSelectedSources] = useState<TimerSource[]>([]);
	const [selectedLogTypes, setSelectedLogTypes] = useState<LogType[]>([]);

	// Memoize dateFilter to prevent infinite API calls (new DateRange object on every render)
	const dateFilter = useMemo((): DateRange | undefined => {
		if (!selectedDate) return undefined;
		const startOfDay = new Date(selectedDate);
		startOfDay.setHours(0, 0, 0, 0);
		const endOfDay = new Date(selectedDate);
		endOfDay.setHours(23, 59, 59, 999);
		return { from: startOfDay, to: endOfDay };
	}, [selectedDate]);

	// Extract filter values for API (undefined if empty for cleaner query params)
	const sourceFilter = selectedSources.length > 0 ? selectedSources : undefined;
	const logTypeFilter = selectedLogTypes.length > 0 ? selectedLogTypes : undefined;

	const { loading, data, error, refetch } = useTimeLogs({
		date: dateFilter,
		activityLevel,
		timeZone,
		source: sourceFilter,
		logType: logTypeFilter
	});

	// Pagination state
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(10);

	// Calculate pagination
	const timeLogs = data || [];
	const totalPages = Math.ceil(timeLogs.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const currentLogs = timeLogs.slice(startIndex, endIndex);

	const handlePageChange = (page: number) => {
		if (page >= 1 && page <= totalPages) {
			setCurrentPage(page);
		}
	};

	const handleSourceChange = (values: string[]) => {
		// Cast string[] to TimerSource[] since MultiSelect returns strings
		setSelectedSources(values as TimerSource[]);
		setCurrentPage(1); // Reset pagination on filter change
	};

	const handleLogTypeChange = (values: string[]) => {
		// Cast string[] to LogType[] since MultiSelect returns strings
		setSelectedLogTypes(values as LogType[]);
		setCurrentPage(1); // Reset pagination on filter change
	};

	const handleDateChange: React.Dispatch<React.SetStateAction<Date | undefined>> = (value) => {
		setSelectedDate(value);
		setCurrentPage(1); // Reset pagination on filter change
	};

	// Get the name of the selected organization from userOrganizations and selectedOrganization
	const orgName =
		userOrganizations?.items.find((elt) => elt.organizationId == selectedOrganization)?.organization?.name ||
		'Ever';

	return (
		<div className={cn('flex flex-col gap-5 w-full bg-white dark:bg-black rounded-2xl p-6 shadow-xs', className)}>
			{/* Header with title and refresh button */}

			<div className="flex items-center justify-between ">
				<h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('title', { orgName })}</h2>
			</div>

			{/* Filters */}
			<div className="w-full flex justify-between items-end flex-wrap gap-4">
				<div className="flex gap-3">
					<TeamsActiveEmployeeSelector label="Select employee" />
					<DatePicker
						date={selectedDate}
						setDate={handleDateChange}
						placeholder={t('filters.select_date')}
						className="min-w-[200px] h-10"
					/>

					<MultiSelect values={selectedSources} onValuesChange={handleSourceChange}>
						<MultiSelectTrigger className="min-w-[200px] h-10 px-4 py-2 dark:border-gray-700">
							<MultiSelectValue placeholder={t('filters.select_sources')} />
						</MultiSelectTrigger>
						<MultiSelectContent className="w-[200px]" search={false}>
							<MultiSelectGroup>
								{SOURCE_OPTIONS.map((source) => (
									<MultiSelectItem key={source} value={source}>
										{t(`sources.${source}`, { defaultValue: source })}
									</MultiSelectItem>
								))}
							</MultiSelectGroup>
						</MultiSelectContent>
					</MultiSelect>

					<MultiSelect values={selectedLogTypes} onValuesChange={handleLogTypeChange}>
						<MultiSelectTrigger className="min-w-[200px] h-10 px-4 py-2 dark:border-gray-700">
							<MultiSelectValue placeholder={t('filters.select_log_types')} />
						</MultiSelectTrigger>
						<MultiSelectContent className="w-[200px]" search={false}>
							<MultiSelectGroup>
								{LOG_TYPE_OPTIONS.map((logType) => (
									<MultiSelectItem key={logType} value={logType}>
										{t(`log_types.${logType}`, { defaultValue: logType })}
									</MultiSelectItem>
								))}
							</MultiSelectGroup>
						</MultiSelectContent>
					</MultiSelect>
				</div>

				<Button
					onClick={() => refetch()}
					disabled={loading}
					variant="outline"
					title={t('actions.refresh')}
					className="flex gap-1 justify-center items-center"
				>
					<RefreshCwIcon className={cn('size-3', loading && 'animate-spin')} />
					{t('actions.refresh')}
				</Button>
			</div>

			{/* Error State */}
			{error && (
				<div
					className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-800"
					role="alert"
				>
					{typeof error.message === 'string' ? error.message : error.error || 'An error occurred'}
				</div>
			)}

			{/* Table */}
			<Table className="border-none rounded-lg">
				<TableHeader>
					<TableRow className="text-gray-500 dark:text-gray-400 text-xs uppercase dark:border-gray-700">
						{showEmployee && <TableHead>{t('table_headers.employee')}</TableHead>}
						<TableHead>{t('table_headers.project')}</TableHead>
						<TableHead>{t('table_headers.log_type')}</TableHead>
						<TableHead>{t('table_headers.source')}</TableHead>
						<TableHead>{t('table_headers.duration')}</TableHead>
						<TableHead>{t('table_headers.time_span')}</TableHead>
						<TableHead>{t('table_headers.notes')}</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody className="relative">
					{loading && <SpinOverlayLoader />}
					{currentLogs.length === 0 ? (
						<TableRow>
							<TableCell colSpan={showEmployee ? 7 : 6} className="text-center text-gray-500 py-8">
								<div className="flex flex-col items-center gap-2">
									<FileText className="size-8 text-gray-400" />
									<span>{t('table_empty.no_time_logs')}</span>
								</div>
							</TableCell>
						</TableRow>
					) : (
						currentLogs.map((log) => (
							<TableRow key={log.id} className="text-sm text-gray-700 dark:text-gray-200 border-none">
								{/* Employee Column (optional) */}
								{showEmployee && (
									<TableCell className="flex items-center gap-3 py-4">
										<Avatar
											src={log.employee?.user?.imageUrl || ''}
											title={log.employee?.fullName || ''}
											fallback={(log.employee?.fullName?.[0] || '?').toUpperCase()}
											className="w-8 h-8 rounded-full"
										/>
										<p className="font-semibold text-sm">{log.employee?.fullName || '-'}</p>
									</TableCell>
								)}

								{/* Project Column */}
								<TableCell className={showEmployee ? '' : 'flex items-center gap-3 py-4'}>
									{log.project?.name && (
										<Avatar
											src={log.project?.imageUrl || ''}
											title={log.project?.name || ''}
											fallback={(log.project?.name?.[0]).toUpperCase()}
											className="w-8 h-8 rounded-full"
										/>
									)}
									<div className="flex flex-col gap-1">
										<p className="font-semibold text-sm">{log.project?.name || '-'}</p>
										{log.organizationContact?.name && (
											<p className="text-xs text-gray-500 dark:text-gray-400 truncate w-28">
												{log.organizationContact?.name}
											</p>
										)}
										{log.task?.title && (
											<p className="text-xs text-gray-500 dark:text-gray-400 truncate w-28">
												{log.task?.title}
											</p>
										)}
									</div>
								</TableCell>

								{/* Log Type Column */}
								<TableCell>
									<Badge variant={getLogTypeBadgeVariant(log.logType)}>
										{log.logType
											? t(`TIMESHEET.log_types.${log.logType}`, { defaultValue: log.logType })
											: '-'}
									</Badge>
								</TableCell>

								{/* Source Column */}
								<TableCell>
									<Badge variant={getSourceBadgeVariant(log.source)}>
										{log.source
											? t(`TIMESHEET.sources.${log.source}`, { defaultValue: log.source })
											: '-'}
									</Badge>
								</TableCell>

								{/* Duration Column */}
								<TableCell className="font-medium">{formatDuration(log.duration)}</TableCell>

								{/* Time Span Column */}
								<TableCell className="text-xs">
									{formatTimeSpan(log.startedAt, log.stoppedAt)}
								</TableCell>

								{/* Notes Column */}
								<TableCell className="max-w-[200px] truncate" title={log.description || ''}>
									{log.description || '-'}
								</TableCell>
							</TableRow>
						))
					)}
				</TableBody>
			</Table>

			{/* Pagination */}
			{timeLogs.length > 0 && (
				<div className="flex items-center justify-between mt-2">
					<Select
						placeholder="Rows per page"
						value={itemsPerPage.toString()}
						onValueChange={(value: string) => {
							setItemsPerPage(Number(value));
							setCurrentPage(1);
						}}
						className="w-fit min-w-[100px] text-sm"
						values={[
							{ label: t('pagination.show', { number: 5 }), value: '5' },
							{ label: t('pagination.show', { number: 10 }), value: '10' },
							{ label: t('pagination.show', { number: 20 }), value: '20' },
							{ label: t('pagination.show', { number: 50 }), value: '50' }
						]}
					/>

					<div className="flex items-center gap-2">
						<Button
							onClick={() => handlePageChange(currentPage - 1)}
							disabled={currentPage === 1}
							variant="secondary"
							className="p-3 border rounded-xl disabled:opacity-50"
						>
							<ChevronLeft className="size-5 text-gray-500" />
						</Button>
						<span className="text-sm text-gray-700 dark:text-gray-200">
							{t('pagination.page', { currentPage, totalPages: totalPages || 1 })}
						</span>
						<Button
							onClick={() => handlePageChange(currentPage + 1)}
							disabled={currentPage === totalPages || totalPages === 0}
							variant="secondary"
							className="p-3 border rounded-xl disabled:opacity-50"
						>
							<ChevronRight className="size-5 text-gray-500" />
						</Button>
					</div>
				</div>
			)}

			<TeamsTimerFooter />
		</div>
	);
};
