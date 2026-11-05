import { useUpdateTimesheet } from '@/core/hooks/timesheet/use-update-timesheet';
import { clsxm } from '@/core/lib/utils';
import { Modal } from '@/core/components';
import { Spinner } from '@/core/components/icons';
import { Button } from '@/core/components/duplicated-components/_button';
import { controlRecipe } from '@/core/components/common/input';
import { type TranslationHooks, useTranslations } from 'next-intl';
import { useState } from 'react';
import { ETimesheetStatus } from '@/core/types/generics/enums/timesheet';
export interface IRejectSelectedModalProps {
	isOpen: boolean;
	closeModal: () => void;
	onReject: (reason: string) => void;
	minReasonLength?: number;
	maxReasonLength?: number;
	selectTimesheetId?: string[];
}
function submitLabelOf(isSubmitting: boolean, t: TranslationHooks) {
	if (isSubmitting) {
		return t('dashboard.timesheets.reject.SUBMITTING');
	}
	return t('common.REJECT');
}

/**
 * A modal for rejecting selected timesheet entries.
 *
 * @param isOpen - If true, show the modal. Otherwise, hide the modal.
 * @param closeModal - A function to close the modal.
 * @param maxReasonLength - The maximum length of the rejection reason.
 * @param onReject - A function to call when the user rejects the selected entries.
 * @param minReasonLength - The minimum length of the rejection reason.
 * @param selectTimesheetId - The IDs of the timesheet entries to be rejected.
 *
 * @returns A modal component.
 */
export function RejectSelectedModal({
	isOpen,
	closeModal,
	maxReasonLength,
	onReject,
	minReasonLength,
	selectTimesheetId
}: IRejectSelectedModalProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [reason, setReason] = useState('');
	const { updateTimesheetStatus, loadingUpdateTimesheetStatus } = useUpdateTimesheet();

	const t = useTranslations();
	const isReasonTooShort = minReasonLength !== undefined && reason.length < minReasonLength;
	const submitLabel = submitLabelOf(isSubmitting, t);
	// The modal stays mounted between openings, so a reason typed for one selection must not carry over to the next.
	const handleClose = () => {
		setReason('');
		closeModal();
	};
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);
		try {
			updateTimesheetStatus({
				status: ETimesheetStatus.DENIED,
				ids: selectTimesheetId || [],
				reason
			})
				.then(() => {
					handleClose();
					onReject(reason);
				})
				.catch((error) => console.error(error));
		} finally {
			setIsSubmitting(false);
		}
	};
	return (
		<Modal
			isOpen={isOpen}
			showCloseIcon={false}
			closeModal={handleClose}
			title={t('pages.timesheet.TIMESHEET_ACTION_REJECT_SELECTED')}
			className="w-full md:w-40 md:min-w-[24rem] justify-start"
		>
			<form onSubmit={handleSubmit}>
				<div className="flex flex-col gap-4">
					<span className="text-sm text-muted-foreground">
						{t('pages.timesheet.YOU_ARE_ABOUT_TO_REJECT_ENTRY')}
					</span>
					<textarea
						value={reason}
						onChange={(e) => setReason(e.target.value)}
						placeholder={t('dashboard.timesheets.reject.REASON_PLACEHOLDER')}
						className={clsxm(
							controlRecipe,
							'h-40 grow resize-none p-3',
							isReasonTooShort && 'border-destructive ring-destructive/20'
						)}
						maxLength={120}
						minLength={0}
						aria-label={t('pages.timesheet.REJECTION_REASON')}
					/>
					<div className="text-xs text-right tabular-nums text-muted-foreground">
						{reason.length}/{maxReasonLength}
					</div>
					<div className="flex gap-x-2 justify-end items-center">
						<Button
							variant="outline"
							size="lg"
							onClick={handleClose}
							type="button"
							disabled={isSubmitting}
						>
							{t('common.CANCEL')}
						</Button>
						<Button
							variant="destructive"
							size="lg"
							type="submit"
							disabled={
								loadingUpdateTimesheetStatus ||
								isSubmitting ||
								(minReasonLength !== undefined && reason.length < minReasonLength)
							}
						>
							{loadingUpdateTimesheetStatus && <Spinner className="animate-spin" />}
							{submitLabel}
						</Button>
					</div>
				</div>
			</form>
		</Modal>
	);
}
