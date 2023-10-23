import { Button, Card, Modal, Text } from 'lib/components';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';

export const RemoveModal = ({
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
	const { t } = useTranslation();
	const [notifyMessage, setNotifyMessage] = useState<string>('');

	return (
		<>
			<Modal isOpen={open} closeModal={close}>
				<Card className="w-full md:min-w-[480px]" shadow="custom">
					<div className="flex flex-col items-center justify-between">
						<Text.Heading as="h3" className="gap-32 text-2xl text-center">
							{title}
						</Text.Heading>

						{notifyMessage && (
							<Text.Error className="self-start mt-2 justify-self-start">{notifyMessage}</Text.Error>
						)}

						<div className="flex items-center justify-between w-full mt-10">
							<Button
								type="button"
								onClick={close}
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
								onClick={() => {
									onAction()?.then((res: any) => {
										if (res?.data?.data?.status) {
											setNotifyMessage(res?.data?.data?.message || '');
											return;
										}

										close();
									});
								}}
							>
								{t('common.CONFIRM')}
							</Button>
						</div>
					</div>
				</Card>
			</Modal>
		</>
	);
};
