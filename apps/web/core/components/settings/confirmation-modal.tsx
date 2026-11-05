import { Button, Modal, Text } from '@/core/components';
import { useTranslations } from 'next-intl';

export const ConfirmationModal = ({
	open,
	close,
	title,
	onAction,
	loading
}: {
	open: boolean;
	close: () => void;
	title: string;
	onAction: () => any;
	loading: boolean;
}) => {
	const t = useTranslations();

	return (
		<>
			<Modal isOpen={open} closeModal={close}>
				<div className="flex w-full flex-col gap-4 sm:w-md">
					<Text.Heading as="h3" className="pr-8">
						{title}
					</Text.Heading>

					<div className="flex w-full flex-wrap items-center justify-end gap-2 pt-2">
						<Button type="button" variant="outline" onClick={close}>
							{t('common.DISCARD')}
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
							{t('common.CONFIRM')}
						</Button>
					</div>
				</div>
			</Modal>
		</>
	);
};
