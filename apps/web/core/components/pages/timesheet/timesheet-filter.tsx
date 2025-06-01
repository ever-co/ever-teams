import { FilterStatus, FilterWithStatus } from '../../timesheet/filter-with-status';
import {
	FrequencySelect,
	TimeSheetFilterPopover,
	TimesheetFilterDate,
	TimesheetFilterDateProps
} from '../../timesheet';
import { Button } from '@/core/components';
import { TranslationHooks } from 'next-intl';
import { useTimelogFilterOptions } from '@/core/hooks';
import { PlusIcon } from '../../timesheet/timesheet-icons';
import { AddTaskModal } from '../../features/timesheet/add-mask-modal';
import { IUser } from '@/core/types/interfaces/user/user';
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
	user?: IUser | undefined;
}

export function TimesheetFilter({
	closeModal,
	isOpen,
	openModal,
	t,
	initDate,
	filterStatus,
	onChangeStatus,
	data,
	user
}: ITimesheetFilter) {
	const { isUserAllowedToAccess } = useTimelogFilterOptions();
	const isManage = isUserAllowedToAccess(user);
	return (
		<>
			{isOpen && <AddTaskModal closeModal={closeModal} isOpen={isOpen} />}
			<div className="flex items-center gap-2.5 justify-between w-full">
				<FilterWithStatus
					data={data}
					activeStatus={filterStatus || 'All Tasks'}
					onToggle={(label) => onChangeStatus?.(label)}
				/>

				<div className="flex gap-2">
					<FrequencySelect />
					<TimesheetFilterDate t={t} {...initDate} data={Object.values(data || {}).flat()} />
					{isManage && (
						<>
							<TimeSheetFilterPopover />
							<Button
								onClick={openModal}
								variant="outline"
								className="bg-primary/5 dark:bg-primary-light dark:border-transparent  !h-[2.2rem] font-medium"
							>
								<PlusIcon />
								{t('common.ADD_TIME')}
							</Button>
						</>
					)}
				</div>
			</div>
		</>
	);
}
