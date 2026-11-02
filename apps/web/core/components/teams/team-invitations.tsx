'use client';

import { useModal } from '@/core/hooks';
import { useRespondToInvitation } from '@/core/hooks/invitations/use-respond-to-invitation';
import { useMyInvitationsQuery } from '@/core/hooks/invitations/use-my-invitations-query';
import { clsxm } from '@/core/lib/utils';
import { Button, Modal, Text } from '@/core/components';
import { CrossCircleIcon as CloseCircleIcon } from 'assets/svg';
import { CheckCircleTickIcon as TickCircleIcon } from 'assets/svg';
import { X } from '@/core/components/icons';
import cloneDeep from 'lodash/cloneDeep';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { LIST_SURFACE_CLASS } from './list-surface';
import { EInviteAction } from '@/core/types/generics/enums/invite';
import { TInvite } from '@/core/types/schemas';

interface IProps {
	className?: string;
	myInvitationsList: TInvite[];
	myInvitations: () => void;
}

function confirmVariantFor(action: EInviteAction) {
	if (action === EInviteAction.ACCEPTED) {
		return 'primary';
	}
	return 'danger';
}

export function TeamInvitations(props: IProps) {
	const { className, myInvitationsList, myInvitations } = props;
	const t = useTranslations();
	const { acceptOrRejectInvitation, acceptOrRejectLoading } = useRespondToInvitation();
	const { removeMyInvitation } = useMyInvitationsQuery();
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
			return acceptOrRejectInvitation(actionInvitationId, action);
		}
	}, [action, actionInvitationId, acceptOrRejectInvitation]);
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

	const pendingInvitations = myInvitationsList.filter(
		(invitation) => !removedInvitations.includes(invitation.id || '')
	);
	const hasPendingInvitations = pendingInvitations.length > 0;
	let confirmTitle = t('pages.home.CONFIRM_REJECT_INVITATION');
	if (action === EInviteAction.ACCEPTED) {
		confirmTitle = t('pages.home.CONFIRM_ACCEPT_INVITATION');
	}

	return (
		<div className={clsxm('mt-6', className)}>
			{hasPendingInvitations && (
				<ul
					className={clsxm(
						LIST_SURFACE_CLASS,
						'flex flex-col hairline-divide-y divide-border overflow-visible'
					)}
				>
					{pendingInvitations.map((invitation, index) => (
						<li className="flex flex-wrap items-center gap-3 px-3 py-2" key={index}>
							<Text className="min-w-0 flex-1 text-sm">
								{t('pages.home.INVITATIONS')}{' '}
								<span className="font-semibold">{invitation.teams?.[0]?.name}</span>
							</Text>

							<div className="flex items-center gap-2">
								<Button
									size="default"
									onClick={() => {
										handleOpenModal(invitation.id || '', EInviteAction.ACCEPTED);
									}}
								>
									<TickCircleIcon className="size-4" />
									{t('common.ACCEPT')}
								</Button>
								<Button
									size="default"
									variant="outline-dark"
									onClick={() => {
										handleOpenModal(invitation.id || '', EInviteAction.REJECTED);
									}}
								>
									<CloseCircleIcon className="size-4 text-muted-foreground" />
									{t('common.REJECT')}
								</Button>
							</div>

							<Button
								variant="ghost"
								size="icon-sm"
								className="text-muted-foreground"
								aria-label={t('common.CLOSE')}
								onClick={() => {
									handleCloseInvitation(invitation.id || '');
								}}
							>
								<X className="size-4" />
							</Button>
						</li>
					))}
				</ul>
			)}

			<ConfirmModal
				open={isOpen}
				close={closeModal}
				onAction={handleAcceptReject}
				loading={acceptOrRejectLoading}
				title={confirmTitle}
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
				<div className="flex w-full flex-col gap-4 sm:w-md">
					<Text.Heading as="h3" className="pr-8">
						{title}
					</Text.Heading>

					{notifyMessage && <Text.Error className="self-start">{notifyMessage}</Text.Error>}

					<div className="flex w-full flex-wrap items-center justify-end gap-2 pt-2">
						<Button variant="outline" size="lg" type="button" onClick={handleOnClose}>
							{t('common.DISCARD')}
						</Button>

						<Button
							variant={confirmVariantFor(action)}
							type="submit"
							size="lg"
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
			</Modal>
		</>
	);
};
