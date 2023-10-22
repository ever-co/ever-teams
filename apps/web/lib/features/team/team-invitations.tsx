import { useModal, useTeamInvitations } from '@app/hooks';
import { MyInvitationActionEnum } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Button, Card, Modal, Text } from 'lib/components';
import { CloseCircleIcon, CloseIcon, TickCircleIcon } from 'lib/components/svgs';
import cloneDeep from 'lodash/cloneDeep';
import { useTranslation } from 'next-i18next';
import { useCallback, useEffect, useState } from 'react';

export function TeamInvitations() {
	const { t } = useTranslation('home');
	const {
		myInvitationsList,
		myInvitations,
		removeMyInvitation,
		acceptRejectMyInvitation,
		acceptRejectMyInvitationsLoading
	} = useTeamInvitations();
	const { isOpen, closeModal, openModal } = useModal();
	const [action, setAction] = useState<MyInvitationActionEnum>();
	const [actionInvitationId, setActionInvitationId] = useState<string>();

	const [removedInvitations, setRemovedInvitations] = useState<string[]>([]);

	useEffect(() => {
		const sessionRemovedInvitations = sessionStorage.getItem('removedInvitations');
		if (sessionRemovedInvitations) {
			const removedInvitations = JSON.parse(sessionRemovedInvitations) as string[];
			setRemovedInvitations(removedInvitations);
		}
	}, []);

	useEffect(() => {
		myInvitations();
	}, [myInvitations]);

	const handleAcceptReject = useCallback(async () => {
		if (actionInvitationId && action) {
			return acceptRejectMyInvitation(actionInvitationId, action);
		}
	}, [action, actionInvitationId, acceptRejectMyInvitation]);
	const handleOpenModal = (invitationid: string, action: MyInvitationActionEnum) => {
		setAction(action);
		setActionInvitationId(invitationid);
		openModal();
	};

	const handleCloseInvitation = useCallback(
		(invitationId: string) => {
			removeMyInvitation(invitationId);

			const clonedRemovedInvitations = cloneDeep(removedInvitations);
			clonedRemovedInvitations.push(invitationId);
			sessionStorage.setItem('removedInvitations', JSON.stringify(clonedRemovedInvitations));
			setRemovedInvitations(clonedRemovedInvitations);
		},
		[removeMyInvitation, removedInvitations]
	);

	return (
		<div className="mt-6">
			{myInvitationsList
				.filter((invitation) => !removedInvitations.includes(invitation.id))
				.map((invitation, index) => (
					<Card
						shadow="bigger"
						className={clsxm(
							'w-full mt-2 flex justify-between',
							'border dark:border-[#28292F] dark:shadow-lg dark:bg-[#1B1D22]',
							'pt-2 pb-2'
						)}
						key={index}
					>
						<Text className="mt-auto mb-auto">
							{t('pages.home.INVITATIONS')}{' '}
							<span className="font-semibold">{invitation.teams[0].name}</span>
						</Text>

						<div className="flex flex-row gap-3 ml-auto mr-5 justify-items-end">
							<Button
								className="pt-2 pb-2 rounded-xl"
								onClick={() => {
									handleOpenModal(invitation.id, MyInvitationActionEnum.ACCEPTED);
								}}
							>
								<TickCircleIcon className="stroke-white" />
								Accept
							</Button>
							<Button
								className="pt-2 pb-2 rounded-xl text-primary dark:text-white"
								variant="outline-dark"
								onClick={() => {
									handleOpenModal(invitation.id, MyInvitationActionEnum.REJECTED);
								}}
							>
								<CloseCircleIcon className="stroke-primary dark:stroke-white" />
								Reject
							</Button>
						</div>

						<button
							onClick={() => {
								handleCloseInvitation(invitation.id);
							}}
						>
							<CloseIcon />
						</button>
					</Card>
				))}

			<ConfirmModal
				open={isOpen}
				close={closeModal}
				onAction={handleAcceptReject}
				loading={acceptRejectMyInvitationsLoading}
				title={
					action === MyInvitationActionEnum.ACCEPTED
						? t('pages.home.CONFIRM_ACCEPT_INVITATION')
						: t('pages.home.CONFIRM_REJECT_INVITATION')
				}
				action={action || MyInvitationActionEnum.ACCEPTED}
			/>
		</div>
	);
}

export const ConfirmModal = ({
	open,
	close,
	title,
	onAction,
	loading,
	action
}: {
	open: boolean;
	close: () => void;
	title: string;
	onAction: () => any;
	loading: boolean;
	action: MyInvitationActionEnum;
}) => {
	const { t } = useTranslation();
	const [notifyMessage, setNotifyMessage] = useState<string>('');

	const handleOnClose = () => {
		setNotifyMessage('');
		close();
	};

	return (
		<>
			<Modal isOpen={open} closeModal={handleOnClose}>
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
								variant="danger"
								type="button"
								onClick={handleOnClose}
								className={
									'bg-transparent text-primary dark:text-dark--theme font-medium border border-gray-300 dark:border-0 dark:bg-light--theme-dark rounded-lg md:min-w-[180px]'
								}
							>
								{t('common.DISCARD')}
							</Button>

							<Button
								variant={action === MyInvitationActionEnum.ACCEPTED ? 'primary' : 'danger'}
								type="submit"
								className="font-medium rounded-lg  md:min-w-[180px]"
								disabled={loading}
								loading={loading}
								onClick={() => {
									onAction()?.then((res: any) => {
										if (res?.message) {
											setNotifyMessage(
												res?.message ||
													(MyInvitationActionEnum.ACCEPTED
														? t('pages.invite.ERROR_WHILE_ACCEPTING_INVITATION')
														: t('pages.invite.ERROR_WHILE_REJECTING_INVITATION'))
											);
											return;
										}

										handleOnClose();
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
