import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from '@/core/components/common/alert-dialog';
import { Button, Modal, Text } from '@/core/components';
import { Spinner } from '@/core/components/icons';
import { buttonVariants } from '@/core/components/duplicated-components/_button';
import { useTranslations } from 'next-intl';

interface AlertDialogConfirmationProps {
	title: string;
	description: string;
	confirmText?: string;
	cancelText?: string;
	onConfirm: () => void;
	onCancel: () => void;
	isOpen: boolean;
	onOpenChange: (isOpen: boolean) => void;
	loading?: boolean;
}

export function AlertDialogConfirmation({
	title,
	description,
	confirmText,
	cancelText,
	onConfirm,
	onCancel,
	isOpen,
	onOpenChange,
	loading
}: AlertDialogConfirmationProps) {
	const t = useTranslations();
	const confirmLabel = confirmText ?? t('common.CONTINUE');
	const cancelLabel = cancelText ?? t('common.CANCEL');
	let actionAriaLabel = confirmLabel;
	let actionText = confirmLabel;
	if (loading) {
		actionAriaLabel = t('modals.confirmation.CONFIRMING');
		actionText = t('common.PROCESSING');
	}
	return (
		<AlertDialog open={isOpen} onOpenChange={onOpenChange} defaultOpen={false}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel onClick={onCancel} autoFocus>
						{cancelLabel}
					</AlertDialogCancel>
					<AlertDialogAction
						className={buttonVariants({ variant: 'destructive', size: 'lg' })}
						aria-label={actionAriaLabel}
						disabled={loading}
						onClick={onConfirm}
					>
						{loading && <Spinner className="size-4 animate-spin" />}
						{actionText}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

export const AlertConfirmationModal = ({
	open,
	close,
	title,
	description,
	onAction,
	loading,
	confirmText,
	cancelText,
	countID = 0
}: {
	open: boolean;
	close: () => void;
	onAction: () => any;
	title: string;
	description: string;
	loading: boolean;
	confirmText?: string;
	cancelText?: string;
	countID?: number;
}) => {
	const t = useTranslations();
	const confirmLabel = confirmText ?? t('common.CONTINUE');
	const cancelLabel = cancelText ?? t('common.CANCEL');
	return (
		<>
			<Modal isOpen={open} closeModal={close} showCloseIcon={false}>
				<div className="w-full md:min-w-[480px]">
					<div className="flex flex-col items-center justify-between">
						<div className="flex flex-col">
							<Text.Heading as="h3" className="text-lg font-semibold text-center text-balance">
								{title}
							</Text.Heading>
							<div className="flex items-center gap-x-2">
								<span className="text-center text-sm text-muted-foreground">{description}</span>
								{countID > 0 && (
									<span className="flex items-center justify-center h-7 min-w-7 px-1.5 rounded-full bg-primary/10 text-sm font-semibold text-center tabular-nums text-primary-ink">
										{' '}
										{countID}
									</span>
								)}
							</div>
						</div>
						<div className="flex items-center justify-end w-full mt-4 gap-x-2">
							<Button type="button" variant="outline" onClick={close}>
								{cancelLabel}
							</Button>
							<Button
								variant="danger"
								type="submit"
								disabled={loading}
								loading={loading}
								onClick={() => {
									onAction()?.then(() => {
										close();
									});
								}}
							>
								{confirmLabel}
							</Button>
						</div>
					</div>
				</div>
			</Modal>
		</>
	);
};
