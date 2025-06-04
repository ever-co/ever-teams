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
import { ReloadIcon } from '@radix-ui/react-icons';
import { EverCard } from '../common/ever-card';

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
	confirmText = 'Continue',
	cancelText = 'Cancel',
	onConfirm,
	onCancel,
	isOpen,
	onOpenChange,
	loading
}: AlertDialogConfirmationProps) {
	return (
		<AlertDialog open={isOpen} onOpenChange={onOpenChange} defaultOpen={false}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel onClick={onCancel} autoFocus>
						{cancelText}
					</AlertDialogCancel>
					<AlertDialogAction
						className="px-4 py-2 text-sm hover:bg-red-600 hover:text-white font-medium text-red-600 border border-red-600 rounded-md bg-light--theme-light dark:!bg-dark--theme-light"
						aria-label={loading ? 'Confirming action...' : confirmText}
						disabled={loading}
						onClick={onConfirm}
					>
						{loading && <ReloadIcon className="w-4 h-4 mr-2 animate-spin" />}
						{loading ? 'Processing...' : confirmText}
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
	confirmText = 'Continue',
	cancelText = 'Cancel',
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
	return (
		<>
			<Modal isOpen={open} closeModal={close} showCloseIcon={false}>
				<EverCard className="w-full md:min-w-[480px]" shadow="custom">
					<div className="flex flex-col items-center justify-between">
						<div className="flex flex-col">
							<Text.Heading as="h3" className="text-2xl text-center">
								{title}
							</Text.Heading>
							<div className="flex items-center gap-x-2">
								<span className="text-center">{description}</span>
								{countID > 0 && (
									<span className="flex items-center justify-center text-xl font-bold text-center text-white rounded-full  h-7 w-7 bg-primary dark:bg-primary-light">
										{' '}
										{countID}
									</span>
								)}
							</div>
						</div>
						<div className="flex items-center justify-end w-full mt-4 gap-x-5">
							<Button
								type="button"
								onClick={close}
								className={
									'px-4 py-2 text-sm font-medium text-gray-700 dark:text-red-600 border rounded-md bg-light--theme-light dark:!bg-dark--theme-light'
								}
							>
								{cancelText}
							</Button>
							<Button
								variant="danger"
								type="submit"
								className="px-4 py-2 text-sm hover:bg-red-600 hover:text-white font-medium text-red-600 border border-red-600 rounded-md bg-light--theme-light dark:!bg-dark--theme-light"
								disabled={loading}
								loading={loading}
								onClick={() => {
									onAction()?.then(() => {
										close();
									});
								}}
							>
								{confirmText}
							</Button>
						</div>
					</div>
				</EverCard>
			</Modal>
		</>
	);
};
