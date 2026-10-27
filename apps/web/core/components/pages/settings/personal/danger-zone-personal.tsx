/* eslint-disable no-mixed-spaces-and-tabs */
import { useModal, useDeleteOrganizationTeam, useUser } from '@/core/hooks';
import { Button } from '@/core/components';
import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { RemoveModal } from '../../../settings/remove-modal';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { ACCOUNT_DELETION_PATH } from '@/core/lib/auth/account-deletion';
type RemoveModalType = 'REMOVE' | 'DELETE' | 'DELETE_ALL' | string;
type ActionFunction = () => Promise<unknown> | undefined;

/** One line per irreversible action: what it does on the left, a quiet outlined danger button on the right. */
const DANGER_ROW =
	'flex flex-col gap-3 border-t border-border py-4 first:border-t-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between';
const DANGER_BUTTON =
	'h-9 shrink-0 whitespace-nowrap rounded-md border border-destructive/40 bg-transparent px-3 text-sm font-medium text-destructive hover:bg-destructive/10 dark:bg-transparent';
const LINK_BUTTON =
	'inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-md border border-border px-3 text-sm font-medium text-foreground hover:bg-muted';

/**
 * Settings → Personal → Danger Zone.
 *
 * - Remove from all teams: `DELETE /organization-team/teams/:userId` (Gauzy), then the teams and the token reload.
 * - Delete this account: `DELETE /user/:id`, then logout (cookies cleared, redirect to sign-in).
 * - Delete all data: `DELETE /user/reset` (Gauzy's factory reset of the user's organizations), then logout. Until
 *   2026-10 this button only logged the user to the console and deleted nothing.
 * - Delete by e-mail link: the public /delete-account flow, for every account with this e-mail (all workspaces).
 *
 * A failed call now shows its reason in the modal (RemoveModal) instead of leaving it open without a word.
 */
export const DangerZone = () => {
	const t = useTranslations();
	const { isOpen, closeModal, openModal } = useModal();
	const [removeModalType, setRemoveModalType] = useState<RemoveModalType>('');

	const { deleteUser, deleteUserLoading, resetUser, resetUserLoading } = useUser();
	const { data: user } = useUserQuery();

	const { removeUserFromAllTeam, removeUserFromAllTeamLoading } = useDeleteOrganizationTeam();
	const handleRemoveUser = useCallback(() => {
		if (user) {
			return removeUserFromAllTeam(user.id);
		}
	}, [user, removeUserFromAllTeam]);

	const handleDeleteAllUserData = useCallback(() => {
		if (user) {
			return resetUser();
		}
	}, [user, resetUser]);

	const actionTypes: Record<RemoveModalType, ActionFunction> = {
		DELETE: deleteUser,
		DELETE_ALL: handleDeleteAllUserData,
		REMOVE: handleRemoveUser
	};
	const modalMessages: Record<RemoveModalType, string> = {
		REMOVE: t('pages.settingsPersonal.ABOUT_TO_REMOVE_FROM_ALL_TEAMS'),
		DELETE: t('pages.settingsPersonal.ABOUT_TO_DELETE_ACCOUNT'),
		DELETE_ALL: t('pages.settingsPersonal.ABOUT_TO_DELETE_ALL_ACCOUNT_DATA')
	};
	const messageToShow = modalMessages[removeModalType] || '';
	const onAction = actionTypes[removeModalType] || handleRemoveUser;

	const rows: { type: RemoveModalType; title: string; description: string }[] = [
		{
			type: 'REMOVE',
			title: t('common.REMOVE_EVERYWHERE'),
			description: t('alerts.ALERT_DELETE_ACCOUNT')
		},
		{
			type: 'DELETE',
			title: t('common.DELETE_ACCOUNT'),
			description: t('alerts.ALERT_ACCOUNT_PERMANENT_DELETE')
		},
		{
			type: 'DELETE_ALL',
			title: t('common.DELETE_ALL_DATA'),
			description: t('alerts.ALERT_REMOVE_ALL_DATA')
		}
	];

	return (
		<>
			<div className="w-full">
				{rows.map((row) => (
					<div key={row.type} className={DANGER_ROW}>
						<div className="min-w-0">
							<p className="text-sm font-medium text-foreground">{row.title}</p>
							<p className="mt-0.5 text-xs text-muted-foreground">{row.description}</p>
						</div>
						<Button
							variant="outline-danger"
							type="button"
							className={DANGER_BUTTON}
							onClick={() => {
								setRemoveModalType(row.type);
								openModal();
							}}
						>
							{row.title}
						</Button>
					</div>
				))}

				<div className={DANGER_ROW}>
					<div className="min-w-0">
						<p className="text-sm font-medium text-foreground">
							{t('pages.accountDeletion.DANGER_ZONE_TITLE')}
						</p>
						<p className="mt-0.5 text-xs text-muted-foreground">
							{t('pages.accountDeletion.DANGER_ZONE_DESCRIPTION')}
						</p>
					</div>
					<Link href={ACCOUNT_DELETION_PATH} className={LINK_BUTTON} data-testid="danger-zone-delete-by-email">
						{t('pages.accountDeletion.DELETE_BY_EMAIL_LINK')}
					</Link>
				</div>

				<RemoveModal
					open={removeModalType && isOpen ? true : false}
					close={closeModal}
					title={messageToShow}
					onAction={onAction}
					loading={deleteUserLoading || removeUserFromAllTeamLoading || resetUserLoading}
				/>
			</div>
		</>
	);
};
