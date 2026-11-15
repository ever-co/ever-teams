'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import NextLink from 'next/link';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { activeTeamIdState } from '@/core/stores';
import { Notice } from '@/core/components/common/notice';
import { Button } from '@/core/components/duplicated-components/_button';
import { Mail, User, UserAdd } from '@/core/components/icons';
import { useHasBeenOpen } from '@/core/hooks/common/use-has-been-open';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useMemberPlaceholders } from '@/core/hooks/settings/use-member-placeholders';
import { SettingsPage } from '@/core/components/settings/kit/settings-page';
import { TeamSettingsGate } from '@/core/components/settings/kit/team-settings-gate';
import { MembersSettingsSkeleton } from './members-settings-skeleton';
import { MembersSection } from './members-section';
import { PendingInvitationsSection } from './pending-invitations-section';
import { JoinRequestsSection } from './join-requests-section';

const InviteFormModal = dynamic(
	() => import('@/core/components/features/teams/invite-form-modal').then((module) => module.InviteFormModal),
	{ ssr: false }
);

const AddPlaceholderDialog = dynamic(
	() => import('./add-placeholder-dialog').then((module) => module.AddPlaceholderDialog),
	{ ssr: false }
);

function UnverifiedNotice() {
	const t = useTranslations();
	return (
		<Notice
			tone="info"
			glyph={<Mail />}
			title={t('settings.members.UNVERIFIED_TITLE')}
			description={t('settings.members.UNVERIFIED_DESCRIPTION')}
			actions={
				<Button asChild variant="outline">
					<NextLink href="/settings/personal">{t('settings.members.UNVERIFIED_ACTION')}</NextLink>
				</Button>
			}
		/>
	);
}

function MembersContent() {
	const t = useTranslations();
	const { data: user } = useUserQuery();
	const teamId = useAtomValue(activeTeamIdState);
	const [isInviteOpen, setIsInviteOpen] = useState(false);
	const mountsInvite = useHasBeenOpen(isInviteOpen);
	const canInvite = Boolean(user?.isEmailVerified);
	const openInvite = () => setIsInviteOpen(true);
	const placeholders = useMemberPlaceholders();
	const [isAddingPlaceholder, setIsAddingPlaceholder] = useState(false);
	const mountsAddPlaceholder = useHasBeenOpen(isAddingPlaceholder);

	return (
		<SettingsPage
			title={t('settings.entries.members.TITLE')}
			description={t('settings.entries.members.DESCRIPTION')}
			actions={
				<div className="flex flex-wrap items-center justify-end gap-2">
					{placeholders.isOffered && (
						<Button type="button" variant="outline" onClick={() => setIsAddingPlaceholder(true)}>
							<User />
							{t('settings.members.placeholder.ADD')}
						</Button>
					)}
					<Button type="button" onClick={openInvite} disabled={!canInvite}>
						<UserAdd />
						{t('common.INVITE')}
					</Button>
				</div>
			}
		>
			{!canInvite && <UnverifiedNotice />}
			<MembersSection key={`members-${teamId}`} onInvite={openInvite} canInvite={canInvite} />
			<PendingInvitationsSection key={`invitations-${teamId}`} onInvite={openInvite} canInvite={canInvite} />
			<JoinRequestsSection />
			{mountsInvite && (
				<InviteFormModal open={isInviteOpen && canInvite} closeModal={() => setIsInviteOpen(false)} />
			)}
			{mountsAddPlaceholder && (
				<AddPlaceholderDialog
					open={isAddingPlaceholder && placeholders.isOffered}
					onClose={() => setIsAddingPlaceholder(false)}
					onAdd={placeholders.addPlaceholder}
				/>
			)}
		</SettingsPage>
	);
}

export function MembersSettingsPage() {
	return (
		<TeamSettingsGate skeleton={<MembersSettingsSkeleton />} requiresManager>
			<MembersContent />
		</TeamSettingsGate>
	);
}
