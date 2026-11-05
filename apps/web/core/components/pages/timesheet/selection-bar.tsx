import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { ETimesheetStatus } from '@/core/types/generics/enums/timesheet';
import { useUpdateTimesheet } from '@/core/hooks/timesheet/use-update-timesheet';
import { useDeleteTimesheet } from '@/core/hooks/timesheet/use-delete-timesheet';
import { useTimesheetReview } from '@/core/hooks/timesheet/use-timesheet-review';
import { useModal } from '@/core/hooks';
import { RejectSelectedModal } from '../../features/timesheet/reject-selected-modal';
import { AlertConfirmationModal } from '@/core/components/common/alert-dialog-confirmation';
import { Button } from '@/core/components/duplicated-components/_button';

type ActionButtonProps = {
	label: string;
	onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
};

const ActionButton = ({ label, onClick }: ActionButtonProps) => (
	<Button variant="outline" size="default" onClick={onClick}>
		{label}
	</Button>
);

interface SelectionBarProps {
	selectedCount: number;
	onApprove?: () => void;
	onReject?: () => void;
	onDelete: () => void;
	onClearSelection: () => void;
}

export const SelectionBar = ({ selectedCount, onApprove, onReject, onDelete, onClearSelection }: SelectionBarProps) => {
	const t = useTranslations();
	return (
		<div className="fixed bottom-5 left-1/2 z-50 flex h-14 -translate-x-1/2 items-center justify-between gap-x-4 rounded-xl bg-popover px-3 text-popover-foreground hairline-ring ring-border shadow-md shadow-black/6.5">
			<div className="flex gap-x-2 justify-start items-center">
				<div className="flex items-center justify-center gap-x-2 pr-2 text-sm text-muted-foreground">
					<div className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary/10 px-1.5 text-xs font-semibold tabular-nums text-primary-ink">
						<span>{selectedCount}</span>
					</div>
					<span>selected</span>
				</div>
				{onApprove && (
					<ActionButton label={t('pages.timesheet.TIMESHEET_ACTION_APPROVE_SELECTED')} onClick={onApprove} />
				)}
				{onReject && (
					<ActionButton label={t('pages.timesheet.TIMESHEET_ACTION_REJECT_SELECTED')} onClick={onReject} />
				)}
				<ActionButton label={t('pages.timesheet.TIMESHEET_ACTION_DELETE_SELECTED')} onClick={onDelete} />
			</div>
			<Button
				variant="ghost"
				size="default"
				onClick={onClearSelection}
				className="text-primary-ink hover:text-primary-ink"
				aria-label="Clear Selection"
			>
				Clear Selection
			</Button>
		</div>
	);
};

interface SelectedTimesheetProps {
	selectTimesheetId: ITimeLog[];
	setSelectTimesheetId: React.Dispatch<React.SetStateAction<ITimeLog[]>>;
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
 * @returns {React.ReactElement} - The rendered timesheet component.
 */
export const SelectedTimesheet: React.FC<SelectedTimesheetProps> = ({ selectTimesheetId, setSelectTimesheetId }) => {
	const t = useTranslations();
	const { updateTimesheetStatus } = useUpdateTimesheet();
	const { deleteTaskTimesheet, loadingDeleteTimesheet } = useDeleteTimesheet();
	// Deleting time logs cannot be undone: ask first, as the list view does
	const { isOpen: isDeleteOpen, openModal: openDeleteConfirm, closeModal: closeDeleteConfirm } = useModal();
	// Approve and reject call PUT /timesheet/status, which takes them from an approver, or from a manager of a team
	// of every selected member
	const { canApproveAndReject } = useTimesheetReview();
	const canUpdateTimeSheetStatus = canApproveAndReject(selectTimesheetId);
	const { isOpen: isRejectModalOpen, openModal: openRejectModal, closeModal: closeRejectModal } = useModal();

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

	const handleDelete = useCallback(async () => {
		try {
			await deleteTaskTimesheet({
				// Delete takes time-log ids, not the timesheet ids getSelectedIds returns for approve and reject
				logIds: selectTimesheetId.map((select) => select.id)
			});
			setSelectTimesheetId([]);
		} catch (error) {
			console.error(error);
		}
	}, [selectTimesheetId, deleteTaskTimesheet, setSelectTimesheetId]);

	return (
		<>
			<AlertConfirmationModal
				title={t('common.DELETE_CONFIRMATION')}
				description={t('common.IRREVERSIBLE_ACTION_WARNING')}
				open={isDeleteOpen}
				close={closeDeleteConfirm}
				loading={loadingDeleteTimesheet}
				countID={selectTimesheetId.length}
				onAction={async () => {
					await handleDelete();
					closeDeleteConfirm();
				}}
			/>
			{canUpdateTimeSheetStatus && (
				<RejectSelectedModal
					selectTimesheetId={getSelectedIds()}
					onReject={() => setSelectTimesheetId([])}
					maxReasonLength={120}
					minReasonLength={0}
					closeModal={closeRejectModal}
					isOpen={isRejectModalOpen}
				/>
			)}
			<SelectionBar
				selectedCount={selectTimesheetId.length}
				onApprove={canUpdateTimeSheetStatus ? handleApprove : undefined}
				onReject={canUpdateTimeSheetStatus ? openRejectModal : undefined}
				onDelete={openDeleteConfirm}
				onClearSelection={() => setSelectTimesheetId([])}
			/>
		</>
	);
};
