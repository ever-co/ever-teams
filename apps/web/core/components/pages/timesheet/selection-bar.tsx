import { cn } from '@/core/lib/helpers';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { ETimesheetStatus } from '@/core/types/generics/enums/timesheet';
import { useUpdateTimesheet } from '@/core/hooks/timesheet/use-update-timesheet';
import { useDeleteTimesheet } from '@/core/hooks/timesheet/use-delete-timesheet';

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
			<div className="flex gap-x-4 justify-start items-center">
				<div className="flex items-center justify-center gap-x-2 text-[#282048] dark:text-[#7a62d8]">
					<div className="flex justify-center items-center w-7 h-7 font-bold text-white rounded-full bg-primary dark:bg-primary-light">
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
	selectTimesheetId: ITimeLog[];
	setSelectTimesheetId: React.Dispatch<React.SetStateAction<ITimeLog[]>>;
	fullWidth: boolean;
}

/**
 * SelectedTimesheet
 *
 * A component that renders a selection bar to handle tasks in the timesheet.
 * It provides buttons to approve, reject, delete and clear the selected tasks.
 * Mutations (approve/reject/delete) are handled internally via dedicated hooks.
 *
 * @param selectTimesheetId - The selected timesheet logs.
 * @param setSelectTimesheetId - A function to set the selected timesheet logs.
 * @param fullWidth - A boolean to indicate if the component should be rendered in full width.
 * @returns {React.ReactElement} - The rendered timesheet component.
 */
export const SelectedTimesheet: React.FC<SelectedTimesheetProps> = ({
	selectTimesheetId,
	setSelectTimesheetId,
	fullWidth
}) => {
	const { updateTimesheetStatus } = useUpdateTimesheet();
	const { deleteTaskTimesheet } = useDeleteTimesheet();

	const getSelectedIds = useCallback(
		() => selectTimesheetId.map((select) => select.timesheet?.id).filter((id): id is string => Boolean(id)),
		[selectTimesheetId]
	);

	const handleApprove = useCallback(async () => {
		try {
			await updateTimesheetStatus({
				status: ETimesheetStatus.APPROVED,
				ids: getSelectedIds()
			});
			setSelectTimesheetId([]);
		} catch (error) {
			console.error(error);
		}
	}, [getSelectedIds, updateTimesheetStatus, setSelectTimesheetId]);

	const handleReject = useCallback(async () => {
		try {
			await updateTimesheetStatus({
				status: ETimesheetStatus.DENIED,
				ids: getSelectedIds()
			});
			setSelectTimesheetId([]);
		} catch (error) {
			console.error(error);
		}
	}, [getSelectedIds, updateTimesheetStatus, setSelectTimesheetId]);

	const handleDelete = useCallback(async () => {
		try {
			await deleteTaskTimesheet({
				logIds: getSelectedIds()
			});
			setSelectTimesheetId([]);
		} catch (error) {
			console.error(error);
		}
	}, [getSelectedIds, deleteTaskTimesheet, setSelectTimesheetId]);

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
