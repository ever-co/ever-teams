// 'use client';

// import {
// 	TeamsMemberInvitationForm,
// 	TeamsMemberInvitationFormDialog,
// 	TeamsTeamMembers,
// 	TeamsTeamSetting,
// 	TeamsTeamsViewer
// } from '@ever-teams/atoms';
// import { JSX } from 'react';
// import { useTranslations } from 'next-intl';

// export default function TeamPage(): JSX.Element {
// 	const t = useTranslations('Dashboard');

// 	return (
// 		<section className="flex flex-col w-full gap-3">
// 			<div className="mb-4">
// 				<h1 className="text-2xl font-bold">{t('team')}</h1>
// 				<p className="text-muted-foreground">{t('team_description')}</p>
// 			</div>
// 			<div>
// 				<TeamsMemberInvitationFormDialog />
// 			</div>
// 			<TeamsTeamSetting className="shadow-none border  dark:border-gray-700 dark:bg-zinc-950 " />
// 			<TeamsTeamMembers className="shadow-none border dark:border-gray-700 dark:bg-zinc-950" />
// 			<TeamsTeamsViewer className="shadow-none border dark:border-gray-700 dark:bg-zinc-950" />
// 			<TeamsMemberInvitationForm className="shadow-none border  dark:border-gray-700 dark:bg-zinc-950" />
// 		</section>
// 	);
// }

'use client';

import { customerPortalAction } from '@/lib/payments/actions';
import { ReactNode, useActionState } from 'react';
import { TeamDataWithMembers, User } from '@/lib/db/schema';
import { removeTeamMember, inviteTeamMember } from '@/app/(login)/actions';
import useSWR from 'swr';
import { Suspense } from 'react';
import { Loader2, PlusCircle } from 'lucide-react';
import {
	AvatarFallback,
	Button,
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
	Input,
	Label,
	RadioGroup,
	RadioGroupItem,
	ShadCnAvatar,
	ThemedButton
} from '@ever-teams/toolkit-ui';
import { useTranslations } from 'next-intl';
import { useFormStatus } from 'react-dom';

type ActionState = {
	error?: string;
	success?: string;
};

const fetcher = (url: string) =>
	fetch(url)
		.then((res) => res.json())
		.catch((error) => console.log(error));

function SubscriptionSkeleton() {
	const t = useTranslations('Dashboard.TeamPage');
	return (
		<Card className="mb-8 h-[140px]">
			<CardHeader>
				<CardTitle>{t('subscription.title')}</CardTitle>
			</CardHeader>
		</Card>
	);
}

function SubmitButton({ children }: { children: ReactNode }) {
	const { pending } = useFormStatus();
	return (
		<Button type="submit" variant="outline">
			{pending ? 'Loading ...' : children}
		</Button>
	);
}

function ManageSubscription() {
	const { data: teamData } = useSWR<TeamDataWithMembers>('/api/team', fetcher);
	const t = useTranslations('Dashboard.TeamPage');

	return (
		<Card className="shadow-none border dark:border-gray-700 dark:bg-zinc-950 mb-8">
			<CardHeader>
				<CardTitle>{t('subscription.title')}</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
						<div className="mb-4 sm:mb-0">
							<p className="font-medium">
								{t('subscription.current_plan')}: {teamData?.planName || t('subscription.free')}
							</p>
							<p className="text-sm text-muted-foreground">
								{teamData?.subscriptionStatus === 'active'
									? t('subscription.billed_monthly')
									: teamData?.subscriptionStatus === 'trialing'
										? t('subscription.trial_period')
										: t('subscription.no_subscription')}
							</p>
						</div>
						<form action={customerPortalAction}>
							<SubmitButton>{t('subscription.manage_subscription')}</SubmitButton>
						</form>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function TeamMembersSkeleton() {
	const t = useTranslations('Dashboard.TeamPage');
	return (
		<Card className="mb-8 h-[140px]">
			<CardHeader>
				<CardTitle>{t('members.title')}</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="animate-pulse space-y-4 mt-1">
					<div className="flex items-center space-x-4">
						<div className="size-8 rounded-full bg-gray-200"></div>
						<div className="space-y-2">
							<div className="h-4 w-32 bg-gray-200 rounded"></div>
							<div className="h-3 w-14 bg-gray-200 rounded"></div>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function TeamMembers() {
	const { data: teamData } = useSWR<TeamDataWithMembers>('/api/team', fetcher);
	const [removeState, removeAction, isRemovePending] = useActionState<ActionState, FormData>(removeTeamMember, {});
	const t = useTranslations('Dashboard.TeamPage');

	const getUserDisplayName = (user: Pick<User, 'id' | 'name' | 'email'>) => {
		return user.name || user.email || 'Unknown User';
	};

	if (!teamData?.teamMembers?.length) {
		return (
			<Card className="shadow-none border dark:border-gray-700 dark:bg-zinc-950 mb-8">
				<CardHeader>
					<CardTitle>{t('members.title')}</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground">{t('members.no_members')}</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="shadow-none border dark:border-gray-700 dark:bg-zinc-950 mb-8">
			<CardHeader>
				<CardTitle>{t('members.title')}</CardTitle>
			</CardHeader>
			<CardContent>
				<ul className="space-y-4">
					{teamData.teamMembers.map((member, index) => (
						<li key={member.id} className="flex items-center justify-between">
							<div className="flex items-center space-x-4">
								<ShadCnAvatar>
									{/*
                    This app doesn't save profile images, but here
                    is how you'd show them:

                    <AvatarImage
                      src={member.user.image || ''}
                      alt={getUserDisplayName(member.user)}
                    />
                  */}
									<AvatarFallback>
										{getUserDisplayName(member.user)
											.split(' ')
											.map((n) => n[0])
											.join('')}
									</AvatarFallback>
								</ShadCnAvatar>
								<div>
									<p className="font-medium">{getUserDisplayName(member.user)}</p>
									<p className="text-sm text-muted-foreground capitalize">{member.role}</p>
								</div>
							</div>
							{index > 1 ? (
								<form action={removeAction}>
									<input type="hidden" name="memberId" value={member.id} />
									<Button type="submit" variant="outline" size="sm" disabled={isRemovePending}>
										{isRemovePending ? t('members.removing') : t('members.remove')}
									</Button>
								</form>
							) : null}
						</li>
					))}
				</ul>
				{removeState?.error && <p className="text-red-500 mt-4">{removeState.error}</p>}
			</CardContent>
		</Card>
	);
}

function InviteTeamMemberSkeleton() {
	const t = useTranslations('Dashboard.TeamPage');
	return (
		<Card className="h-[260px]">
			<CardHeader>
				<CardTitle>{t('invite.title')}</CardTitle>
			</CardHeader>
		</Card>
	);
}

function InviteTeamMember() {
	const { data: user } = useSWR<User>('/api/user', fetcher);
	const isOwner = user?.role === 'owner';
	const [inviteState, inviteAction, isInvitePending] = useActionState<ActionState, FormData>(inviteTeamMember, {});
	const t = useTranslations('Dashboard.TeamPage');

	return (
		<Card className="shadow-none border dark:border-gray-700 dark:bg-zinc-950">
			<CardHeader>
				<CardTitle>{t('invite.title')}</CardTitle>
			</CardHeader>
			<CardContent>
				<form action={inviteAction} className="space-y-4">
					<div>
						<Label htmlFor="email" className="mb-2">
							{t('invite.email_label')}
						</Label>
						<Input
							id="email"
							name="email"
							type="email"
							placeholder={t('invite.email_placeholder')}
							required
							disabled={!isOwner}
						/>
					</div>
					<div>
						<Label>{t('invite.role_label')}</Label>
						<RadioGroup defaultValue="member" name="role" className="flex space-x-4" disabled={!isOwner}>
							<div className="flex items-center space-x-2 mt-2">
								<RadioGroupItem value="member" id="member" />
								<Label htmlFor="member">{t('invite.member')}</Label>
							</div>
							<div className="flex items-center space-x-2 mt-2">
								<RadioGroupItem value="owner" id="owner" />
								<Label htmlFor="owner">{t('invite.owner')}</Label>
							</div>
						</RadioGroup>
					</div>
					{inviteState?.error && <p className="text-red-500">{inviteState.error}</p>}
					{inviteState?.success && <p className="text-green-500">{inviteState.success}</p>}
					<ThemedButton
						type="submit"
						className="bg-blue-500 hover:bg-blue-600 text-white"
						disabled={isInvitePending || !isOwner}
					>
						{isInvitePending ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								{t('invite.inviting')}
							</>
						) : (
							<>
								<PlusCircle className="mr-2 h-4 w-4" />
								{t('invite.invite_button')}
							</>
						)}
					</ThemedButton>
				</form>
			</CardContent>
			{!isOwner && (
				<CardFooter>
					<p className="text-sm text-muted-foreground">{t('invite.owner_required')}</p>
				</CardFooter>
			)}
		</Card>
	);
}

export default function TeamPage() {
	const t = useTranslations('Dashboard');
	return (
		<section>
			<div className="mb-4">
				<h1 className="text-2xl font-bold">{t('team')}</h1>
				<p className="text-muted-foreground">{t('team_description')}</p>
			</div>
			<Suspense fallback={<SubscriptionSkeleton />}>
				<ManageSubscription />
			</Suspense>
			<Suspense fallback={<TeamMembersSkeleton />}>
				<TeamMembers />
			</Suspense>
			<Suspense fallback={<InviteTeamMemberSkeleton />}>
				<InviteTeamMember />
			</Suspense>
		</section>
	);
}
