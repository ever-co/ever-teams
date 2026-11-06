import { FilterStatus, FilterWithStatus } from '../../timesheet/filter-with-status';
import {
	FrequencySelect,
	TimeSheetFilterPopover,
	TimesheetFilterDate,
	TimesheetFilterDateProps
} from '../../timesheet';
import { Button } from '@/core/components';
import { TranslationHooks } from 'next-intl';
import { ReactNode } from 'react';
import { useIsMemberManager, useTimelogFilterOptions } from '@/core/hooks';
import { Plus } from '@/core/components/icons';
import { AddTaskModal } from '../../features/timesheet/add-mask-modal';
import { TUser } from '@/core/types/schemas';
import { ETimesheetStatus } from '@/core/types/generics/enums/timesheet';
import { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

interface ITimesheetFilter {
	isOpen: boolean;
	openModal: () => void;
	closeModal: () => void;
	t: TranslationHooks;
	initDate?: Pick<TimesheetFilterDateProps, 'initialRange' | 'onChange' | 'maxDate' | 'minDate'>;
	onChangeStatus?: (status: FilterStatus) => void;
	filterStatus?: FilterStatus;
	data?: Record<ETimesheetStatus, ITimeLog[]>;
	user?: TUser | null;
	/** The page title, rendered at the start of the row that carries the controls. */
	children?: ReactNode;
}

/** The toolbar rows of the timesheet page: the title with the period, date and filter controls, then the status chips. */
export function TimesheetFilter({
	closeModal,
	isOpen,
	openModal,
	t,
	initDate,
	filterStatus,
	onChangeStatus,
	data,
	user,
	children
}: ITimesheetFilter) {
	const { isUserAllowedToAccess } = useTimelogFilterOptions();
	const isManage = isUserAllowedToAccess(user);
	const { isTeamManager } = useIsMemberManager(user);
	return (
		<>
			{isOpen && <AddTaskModal closeModal={closeModal} isOpen={isOpen} />}
			<div className="flex flex-wrap items-center justify-between gap-3 py-3">
				{children}
				<div className="ml-auto flex flex-wrap items-center gap-2">
					<FrequencySelect />
					<TimesheetFilterDate t={t} {...initDate} data={Object.values(data || {}).flat()} />
					{(isManage || isTeamManager) && <TimeSheetFilterPopover />}
					{/* The API records manual time for the caller unless they may act for every employee */}
					{isManage && (
						<Button onClick={openModal} variant="primary" size="default">
							<Plus />
							{t('common.ADD_TIME')}
						</Button>
					)}
				</div>
			</div>
			<div className="pb-3">
				<FilterWithStatus
					data={data}
					activeStatus={filterStatus || 'All Tasks'}
					onToggle={(label) => onChangeStatus?.(label)}
				/>
			</div>
		</>
	);
}
