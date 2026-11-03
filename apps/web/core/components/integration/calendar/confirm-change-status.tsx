import { clsxm } from '@/core/lib/utils';
import { Badge } from '@/core/components/common/badge';
import { Button } from '@/core/components/duplicated-components/_button';
import { Modal } from '@/core/components';
import { controlRecipe } from '@/core/components/common/input';
import React from 'react';

const STATUS_TEXT_CLASSES: Record<string, string> = {
	Rejected: 'text-destructive-ink',
	Approved: 'text-success-foreground',
	Pending: 'text-warning-foreground'
};

const FALLBACK_STATUS_TEXT_CLASS = 'text-muted-foreground';

const STATUS_BADGE_TONES: Record<string, string> = {
	Rejected: 'bg-destructive/10 text-destructive-ink',
	Approved: 'bg-success/10 text-success-foreground',
	Pending: 'bg-warning/10 text-warning-foreground'
};

const COUNTED_STATUS_BADGE_CLASSES = 'bg-card font-normal text-foreground hairline-ring ring-border';

const OTHER_STATUS_BADGE_CLASSES = 'bg-transparent font-normal text-muted-foreground';

function statusBadgeClassesFor(selected?: string, filterNumber?: string) {
	const tone = selected && STATUS_BADGE_TONES[selected];
	if (!tone) {
		return OTHER_STATUS_BADGE_CLASSES;
	}
	if (filterNumber) {
		return COUNTED_STATUS_BADGE_CLASSES;
	}
	return tone;
}

interface ConfirmStatusChangeProps {
	isOpen?: boolean;
	newStatus?: string;
	oldStatus?: string;
	closeModal?: () => void;
}
export function ConfirmStatusChange({ closeModal, isOpen, newStatus, oldStatus }: ConfirmStatusChangeProps) {
	const getStatusClasses = (status?: string) => {
		if (!status) {
			return FALLBACK_STATUS_TEXT_CLASS;
		}
		return STATUS_TEXT_CLASSES[status] || FALLBACK_STATUS_TEXT_CLASS;
	};
	const newStatusClass = getStatusClasses(newStatus);
	const oldStatusClass = getStatusClasses(oldStatus);

	return (
		<>
			{closeModal ? (
				<Modal
					isOpen={isOpen ? isOpen : false}
					closeModal={closeModal}
					title={'Confirm Change'}
					className="w-full md:w-40 md:min-w-[24rem] justify-start"
				>
					<div className="flex flex-col gap-y-4 items-center">
						<span className="text-sm font-medium text-foreground">Time entry will be changed from</span>
						<StatusTransition
							currentStatus={newStatus || ''}
							previousStatus={oldStatus || ''}
							currentStatusClass={newStatusClass}
							previousStatusClass={oldStatusClass}
						/>

						<CommentInputArea />
						<ConfirmationButtons onCancel={closeModal} />
					</div>
				</Modal>
			) : (
				<></>
			)}
		</>
	);
}

const StatusTransition = ({
	previousStatus,
	currentStatus,
	currentStatusClass,
	previousStatusClass
}: {
	previousStatus: string;
	currentStatus: string;
	currentStatusClass: string;
	previousStatusClass: string;
}) => (
	<div className="flex items-center gap-x-2 text-sm font-medium">
		<span className={clsxm(previousStatusClass, 'line-through font-normal')}>{previousStatus}</span>
		<span>to</span>
		<span className={clsxm(currentStatusClass)}>{currentStatus}</span>
	</div>
);

const ConfirmationButtons = ({ onConfirm, onCancel }: { onConfirm?: () => void; onCancel?: () => void }) => (
	<div className="flex items-center justify-between w-full gap-2">
		<Button onClick={onCancel} variant="outline" size="lg" className="w-full">
			Cancel
		</Button>
		<Button onClick={onConfirm} size="lg" className="w-full">
			Confirm
		</Button>
	</div>
);

const CommentInputArea = () => {
	const commentId = React.useId();
	return (
		<>
			<span className="text-center text-sm text-balance text-muted-foreground">
				Add a comment for this change that the employee will see
			</span>
			<div className="flex flex-col gap-1.5 w-full mt-2">
				<label htmlFor={commentId} className="block text-sm font-medium leading-none text-foreground">
					Comment (optional)
				</label>
				<textarea
					id={commentId}
					placeholder="Add comment"
					className={clsxm(controlRecipe, 'h-32 resize-none p-3')}
				/>
			</div>
		</>
	);
};

export function StatusBadge({ selectedStatus, filterNumber }: { selectedStatus?: string; filterNumber?: string }) {
	const [selected] = React.useState(selectedStatus);
	const badgeClasses = statusBadgeClassesFor(selected, filterNumber);

	return (
		<Badge className={clsxm('px-2 text-center', badgeClasses)}>
			{filterNumber} {selected}
		</Badge>
	);
}
