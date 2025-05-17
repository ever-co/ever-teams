import { ID, TimesheetLog, TimesheetStatus } from '@/core/types/interfaces';
import { cn } from '@/core/lib/helpers';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

type ActionButtonProps = {
	label: string;
	onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
};

const ActionButton = ({ label, onClick }: ActionButtonProps) => (
	<button
		className="bg-white font-semibold h-8 px-3 rounded-lg text-[#282048] dark:text-white dark:bg-primary-light"
		onClick={onClick}
	>
		{label}
	</button>
);

interface SelectionBarProps {
	fullWidth: boolean;
	selectedCount: number;
	onApprove: () => void;
	onReject: () => void;
	onDelete: () => void;
	onClearSelection: () => void;
}

export const SelectionBar = ({
	fullWidth,
	selectedCount,
	onApprove,
	onReject,
	onDelete,
	onClearSelection
}: SelectionBarProps) => {
	const t = useTranslations();
	return (
		<div
			className={cn(
				'bg-[#E2E2E2CC] fixed dark:bg-slate-800 opacity-85 h-16 z-50  bottom-5 left-1/2 transform -translate-x-1/2 shadow-lg rounded-2xl flex items-center justify-between gap-x-4 px-4',
				fullWidth && 'x-container'
			)}
		>
			<div className="flex items-center justify-start gap-x-4">
				<div className="flex items-center justify-center gap-x-2 text-[#282048] dark:text-[#7a62d8]">
					<div className="bg-primary dark:bg-primary-light text-white rounded-full h-7 w-7 flex items-center justify-center font-bold">
						<span>{selectedCount}</span>
					</div>
					<span>selected</span>
				</div>
				<ActionButton label={t('pages.timesheet.TIMESHEET_ACTION_APPROVE_SELECTED')} onClick={onApprove} />
				<ActionButton label={t('pages.timesheet.TIMESHEET_ACTION_REJECT_SELECTED')} onClick={onReject} />
				<ActionButton label={t('pages.timesheet.TIMESHEET_ACTION_DELETE_SELECTED')} onClick={onDelete} />
			</div>
			<button
				onClick={onClearSelection}
				className="font-semibold h-8 px-3 rounded-lg text-[#3826A6] dark:text-primary-light"
				aria-label="Clear Selection"
			>
				Clear Selection
			</button>
		</div>
	);
};

interface SelectedTimesheetProps {
	selectTimesheetId: TimesheetLog[];
	updateTimesheetStatus: ({ status, ids }: { status: TimesheetStatus; ids: ID[] | ID }) => Promise<void>;
	deleteTaskTimesheet: ({ logIds }: { logIds: string[] }) => Promise<void>;
	setSelectTimesheetId: React.Dispatch<React.SetStateAction<TimesheetLog[]>>;
	fullWidth: boolean;
}

/**
 * SelectedTimesheet
 *
 * A component that renders a selection bar to handle tasks in the timesheet.
 * It provides buttons to approve, reject, delete and clear the selected tasks.
 *
 * @param selectTimesheetId - The selected timesheet logs.
 * @param updateTimesheetStatus - A function to update the status of the selected timesheet logs.
 * @param deleteTaskTimesheet - A function to delete the selected timesheet logs.
 * @param setSelectTimesheetId - A function to set the selected timesheet logs.
 * @param fullWidth - A boolean to indicate if the component should be rendered in full width.
 * @returns {React.ReactElement} - The rendered timesheet component.
 */
export const SelectedTimesheet: React.FC<SelectedTimesheetProps> = ({
	selectTimesheetId,
	updateTimesheetStatus,
	deleteTaskTimesheet,
	setSelectTimesheetId,
	fullWidth
}) => {
	const handleApprove = useCallback(async () => {
		try {
			updateTimesheetStatus({
				status: 'APPROVED',
				ids: selectTimesheetId.map((select) => select.timesheet.id).filter((id) => id !== undefined)
			}).then(() => {
				setSelectTimesheetId([]);
			});
		} catch (error) {
			console.error(error);
		}
	}, [selectTimesheetId, updateTimesheetStatus]);

	const handleReject = useCallback(async () => {
		try {
			updateTimesheetStatus({
				status: 'DENIED',
				ids: selectTimesheetId.map((select) => select.timesheet.id).filter((id) => id !== undefined)
			}).then(() => {
				setSelectTimesheetId([]);
			});
		} catch (error) {
			console.error(error);
		}
	}, [selectTimesheetId, updateTimesheetStatus]);

	const handleDelete = useCallback(async () => {
		try {
			deleteTaskTimesheet({
				logIds: selectTimesheetId?.map((select) => select.timesheet.id).filter((id) => id !== undefined)
			}).then(() => {
				setSelectTimesheetId([]);
			});
		} catch (error) {
			console.error(error);
		}
	}, [selectTimesheetId, deleteTaskTimesheet, setSelectTimesheetId]);

	return (
		<SelectionBar
			selectedCount={selectTimesheetId.length}
			onApprove={handleApprove}
			onReject={handleReject}
			onDelete={handleDelete}
			onClearSelection={() => setSelectTimesheetId([])}
			fullWidth={fullWidth}
		/>
	);
};
