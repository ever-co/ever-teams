import { useTimesheet } from '@/core/hooks/activities/use-timesheet';
import { clsxm } from '@/core/lib/utils';
import { Modal } from '@/core/components';
import { ReloadIcon } from '@radix-ui/react-icons';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ETimesheetStatus } from '@/core/types/interfaces/enums/timesheet';
export interface IRejectSelectedModalProps {
	isOpen: boolean;
	closeModal: () => void;
	onReject: (reason: string) => void;
	minReasonLength?: number;
	maxReasonLength?: number;
	selectTimesheetId?: string[];
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
	const { updateTimesheetStatus, loadingUpdateTimesheetStatus, setSelectTimesheetId } = useTimesheet({});

	const t = useTranslations();
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);
		try {
			updateTimesheetStatus({
				status: ETimesheetStatus.DENIED,
				ids: selectTimesheetId || []
			})
				.then(() => {
					setSelectTimesheetId([]);
					closeModal();
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
			closeModal={closeModal}
			title={'Reject Selected'}
			className="bg-light--theme-light dark:bg-dark--theme-light p-5 rounded-xl w-full md:w-40 md:min-w-[24rem] justify-start"
			titleClass="font-bold"
		>
			<form onSubmit={handleSubmit}>
				<div className="flex flex-col gap-4">
					<span className="text-[#71717A] text-center">
						{t('pages.timesheet.YOU_ARE_ABOUT_TO_REJECT_ENTRY')}
					</span>
					<textarea
						value={reason}
						onChange={(e) => setReason(e.target.value)}
						placeholder="Add reason here..."
						className={clsxm(
							'bg-transparent focus:border-transparent focus:ring-2 focus:ring-transparent',
							'placeholder-gray-300 placeholder:font-normal resize-none p-2 grow',
							'border border-gray-200 dark:border-slate-600 dark:bg-dark--theme-light rounded-md h-40',

							minReasonLength !== undefined && reason.length < minReasonLength && 'border-red-500'
						)}
						maxLength={120}
						minLength={0}
						aria-label="Rejection reason"
						required
					/>
					<div className="text-sm text-right text-gray-500">
						{reason.length}/{maxReasonLength}
					</div>
					<div className="flex items-center justify-end gap-x-4">
						<button
							onClick={closeModal}
							type="button"
							disabled={isSubmitting}
							aria-label="Cancel rejection"
							className="dark:text-primary border-[#E2E8F0] dark:border-slate-600 font-normal dark:bg-dark--theme-light h-[2.2rem] text-gray-700 border px-2 rounded-lg"
						>
							{t('common.CANCEL')}
						</button>
						<button
							type="submit"
							disabled={
								loadingUpdateTimesheetStatus ||
								isSubmitting ||
								(minReasonLength !== undefined && reason.length < minReasonLength)
							}
							aria-label="Confirm rejection"
							className={clsxm(
								'bg-red-600 h-[2.2rem] font-normal flex items-center text-white px-2 rounded-lg',
								'disabled:opacity-50 disabled:cursor-not-allowed'
							)}
						>
							{loadingUpdateTimesheetStatus && <ReloadIcon className="w-4 h-4 mr-2 animate-spin" />}
							{isSubmitting ? 'Rejecting...' : 'Reject Entry'}
						</button>
					</div>
				</div>
			</form>
		</Modal>
	);
}
