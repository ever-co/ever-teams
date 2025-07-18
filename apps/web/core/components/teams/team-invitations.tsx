'use client';

import { useModal, useTeamInvitations } from '@/core/hooks';
import { clsxm } from '@/core/lib/utils';
import { Button, Modal, Text } from '@/core/components';
import { CrossCircleIcon as CloseCircleIcon } from 'assets/svg';
import { CrossIcon, CheckCircleTickIcon as TickCircleIcon } from 'assets/svg';
import cloneDeep from 'lodash/cloneDeep';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { EverCard } from '../common/ever-card';
import { EInviteAction } from '@/core/types/generics/enums/invite';
import { TInvite } from '@/core/types/schemas';

interface IProps {
	className?: string;
	myInvitationsList: TInvite[];
	myInvitations: () => void;
}

export function TeamInvitations(props: IProps) {
	const { className, myInvitationsList, myInvitations } = props;
	const t = useTranslations();
	const { removeMyInvitation, acceptRejectMyInvitation, acceptRejectMyInvitationsLoading } = useTeamInvitations();
	const { isOpen, closeModal, openModal } = useModal();
	const [action, setAction] = useState<EInviteAction>();
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
	const handleOpenModal = (invitationid: string, action: EInviteAction) => {
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
		<div className={clsxm('mt-6', className)}>
			{myInvitationsList
				.filter((invitation) => !removedInvitations.includes(invitation.id || ''))
				.map((invitation, index) => (
					<EverCard
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
							<span className="font-semibold">{invitation.teams?.[0]?.name}</span>
						</Text>

						<div className="flex flex-row gap-3 justify-items-end mr-5 ml-auto">
							<Button
								className="pt-2 pb-2 rounded-xl"
								onClick={() => {
									handleOpenModal(invitation.id || '', EInviteAction.ACCEPTED);
								}}
							>
								<TickCircleIcon className="text-white w-full max-w-[17px]" />
								{t('common.ACCEPT')}
							</Button>
							<Button
								className="pt-2 pb-2 rounded-xl text-primary dark:text-white"
								variant="outline-dark"
								onClick={() => {
									handleOpenModal(invitation.id || '', EInviteAction.REJECTED);
								}}
							>
								<CloseCircleIcon className="text-primary dark:text-white w-[18px]" />
								{t('common.REJECT')}
							</Button>
						</div>

						<button
							onClick={() => {
								handleCloseInvitation(invitation.id || '');
							}}
						>
							<CrossIcon className="w-5 h-5" />
						</button>
					</EverCard>
				))}

			<ConfirmModal
				open={isOpen}
				close={closeModal}
				onAction={handleAcceptReject}
				loading={acceptRejectMyInvitationsLoading}
				title={
					action === EInviteAction.ACCEPTED
						? t('pages.home.CONFIRM_ACCEPT_INVITATION')
						: t('pages.home.CONFIRM_REJECT_INVITATION')
				}
				action={action || EInviteAction.ACCEPTED}
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
	action: EInviteAction;
}) => {
	const t = useTranslations();
	const [notifyMessage, setNotifyMessage] = useState<string>('');

	const handleOnClose = () => {
		setNotifyMessage('');
		close();
	};

	return (
		<>
			<Modal isOpen={open} closeModal={handleOnClose}>
				<EverCard className="w-full md:min-w-[480px]" shadow="custom">
					<div className="flex flex-col justify-between items-center">
						<Text.Heading as="h3" className="gap-32 text-2xl text-center">
							{title}
						</Text.Heading>

						{notifyMessage && (
							<Text.Error className="justify-self-start self-start mt-2">{notifyMessage}</Text.Error>
						)}

						<div className="flex justify-between items-center mt-10 w-full">
							<Button
								variant="danger"
								type="button"
								onClick={handleOnClose}
								className={
									'font-medium bg-transparent rounded-lg border border-gray-300 text-primary dark:text-dark--theme dark:border-0 dark:bg-light--theme-dark md:min-w-[180px]'
								}
							>
								{t('common.DISCARD')}
							</Button>

							<Button
								variant={action === EInviteAction.ACCEPTED ? 'primary' : 'danger'}
								type="submit"
								className="font-medium rounded-lg  md:min-w-[180px]"
								disabled={loading}
								loading={loading}
								onClick={() => {
									onAction()?.then((res: any) => {
										if (res?.message) {
											setNotifyMessage(
												res?.message ||
													(EInviteAction.ACCEPTED
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
				</EverCard>
			</Modal>
		</>
	);
};
