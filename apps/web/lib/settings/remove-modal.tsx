import { CreateReponse, IOrganizationTeam } from '@app/interfaces';
import { AxiosResponse } from 'axios';
import { Button, Text, Modal, Card } from 'lib/components';
import { useTranslation } from 'lib/i18n';

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
	onAction: () =>
		| Promise<AxiosResponse<CreateReponse<IOrganizationTeam>, any>>
		| undefined;
	loading: boolean;
}) => {
	const { trans } = useTranslation();

	return (
		<>
			<Modal isOpen={open} closeModal={close}>
				<Card className="w-full md:min-w-[480px]" shadow="custom">
					<div className="flex flex-col justify-between items-center">
						<Text.Heading as="h3" className="text-center gap-32 text-2xl">
							{title}
						</Text.Heading>
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
									onAction()
										?.then(() => {
											// TODO
										})
										.finally(() => {
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
