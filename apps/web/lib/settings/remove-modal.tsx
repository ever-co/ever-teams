import { Button, Text, Modal, Card } from 'lib/components';
import { useTranslation } from 'lib/i18n';
import { useState } from 'react';

export const RemoveModal = ({
	open,
	close,
	title,
	onAction,
	loading,
}: {
	open: boolean;
	close: () => void;
	title: string;
	onAction: () => any;
	loading: boolean;
}) => {
	const { trans } = useTranslation();
	const [notifyMessage, setNotifyMessage] = useState<string>('');

	return (
		<>
			<Modal isOpen={open} closeModal={close}>
				<Card className="w-full md:min-w-[480px]" shadow="custom">
					<div className="flex flex-col justify-between items-center">
						<Text.Heading as="h3" className="text-center gap-32 text-2xl">
							{title}
						</Text.Heading>

						{notifyMessage && (
							<Text.Error className="self-start justify-self-start mt-2">
								{notifyMessage}
							</Text.Error>
						)}

						<div className="w-full flex justify-between mt-10 items-center">
							<Button
								type="button"
								onClick={close}
								className={
									'bg-transparent text-primary dark:text-dark--theme font-medium border border-gray-300 dark:border-0 dark:bg-light--theme-dark rounded-lg md:min-w-[180px]'
								}
							>
								{trans.common.DISCARD}
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
								{trans.common.CONFIRM}
							</Button>
						</div>
					</div>
				</Card>
			</Modal>
		</>
	);
};
