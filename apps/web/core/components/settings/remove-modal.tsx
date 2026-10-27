import { Button, Modal, Text } from '@/core/components';
import { ReactNode, useState } from 'react';
import { useTranslations } from 'next-intl';
import { EverCard } from '../common/ever-card';

export const RemoveModal = ({
	open,
	close,
	title,
	onAction,
	loading,
	children
}: {
	open: boolean;
	close: () => void;
	title: string;
	onAction: () => any;
	loading: boolean;
	/** Optional details under the title (e.g. what a deletion will remove). */
	children?: ReactNode;
}) => {
	const t = useTranslations();
	const [notifyMessage, setNotifyMessage] = useState<string>('');
	// A message is about one attempt: the next opening of the modal starts clean.
	const handleClose = () => {
		setNotifyMessage('');
		close();
	};

	return (
		<>
			<Modal isOpen={open} closeModal={handleClose}>
				<EverCard className="w-full md:min-w-[480px]" shadow="custom">
					<div className="flex flex-col items-center justify-between">
						<Text.Heading as="h3" className="gap-32 text-2xl text-center">
							{title}
						</Text.Heading>

						{children && <div className="self-stretch mt-4">{children}</div>}

						{notifyMessage && (
							<Text.Error className="self-start mt-2 justify-self-start">{notifyMessage}</Text.Error>
						)}

						<div className="flex items-center justify-between w-full mt-10">
							<Button
								type="button"
								onClick={handleClose}
								className={
									'bg-transparent text-primary dark:text-dark--theme font-medium border border-gray-300 dark:border-0 dark:bg-light--theme-dark rounded-lg md:min-w-[180px]'
								}
							>
								{t('common.DISCARD')}
							</Button>

							<Button
								variant="danger"
								type="submit"
								className="font-medium rounded-lg bg-[#EB6961] md:min-w-[180px]"
								disabled={loading}
								loading={loading}
								onClick={async () => {
									setNotifyMessage('');
									// A failed action used to be an unhandled rejection: the modal stayed open, silent.
									try {
										const res = await onAction();
										if (res?.data?.data?.status) {
											setNotifyMessage(res?.data?.data?.message || '');
											return;
										}

										handleClose();
									} catch (error) {
										const reason = error instanceof Error && error.message ? ` ${error.message}` : '';
										setNotifyMessage(`${t('alerts.ACTION_FAILED')}${reason}`);
									}
								}}
							>
								{t('common.CONFIRM')}
							</Button>
						</div>
					</div>
				</EverCard>
			</Modal>
		</>
	);
};
