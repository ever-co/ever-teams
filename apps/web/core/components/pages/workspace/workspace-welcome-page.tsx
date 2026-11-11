'use client';

import NextLink from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { Button } from '@/core/components/duplicated-components/_button';
import { Notice } from '@/core/components/common/notice';
import { ArrowRight, Folder, Task, UserAdd } from '@/core/components/icons';
import type { IconComponent } from '@/core/components/icons/hugeicons';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';

const STEP_CARD =
	'group flex items-start gap-3 rounded-xl bg-card px-4 py-3.5 hairline-ring ring-border transition-colors hover:bg-foreground/[0.03] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25';

interface Step {
	href: string;
	icon: IconComponent;
	title: string;
	description: string;
}

/**
 * `/workspace/welcome` (#5025): where a workspace just created opens. It says how the invitations went and leads to
 * the first things to set up; the pages it leads to have their own empty states.
 */
export function WorkspaceWelcomePage() {
	const t = useTranslations();
	const searchParams = useSearchParams();
	const { data: user } = useUserQuery();
	const workspaceName = user?.tenant?.name || t('workspaceCreation.UNNAMED_WORKSPACE');
	const invited = Number(searchParams.get('invited') ?? 0);
	const invitesFailed = searchParams.get('invitesFailed') === '1';

	const steps: Step[] = [
		{
			href: '/settings/team/members',
			icon: UserAdd,
			title: t('workspaceCreation.STEP_INVITE_TITLE'),
			description: t('workspaceCreation.STEP_INVITE_DESCRIPTION')
		},
		{
			href: '/projects',
			icon: Folder,
			title: t('workspaceCreation.STEP_PROJECT_TITLE'),
			description: t('workspaceCreation.STEP_PROJECT_DESCRIPTION')
		},
		{
			href: '/',
			icon: Task,
			title: t('workspaceCreation.STEP_TASK_TITLE'),
			description: t('workspaceCreation.STEP_TASK_DESCRIPTION')
		}
	];

	return (
		<PageLayout title={t('workspaceCreation.WELCOME_TITLE')} className="min-h-0 flex-1">
			<div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-8">
				<header className="flex flex-col gap-1.5">
					<h1 className="text-lg font-semibold text-foreground">{t('workspaceCreation.WELCOME_TITLE')}</h1>
					<p className="text-[13px] text-pretty text-muted-foreground">
						{t('workspaceCreation.WELCOME_DESCRIPTION', { workspace: workspaceName })}
						{invited > 0 && <> {t('workspaceCreation.WELCOME_INVITED', { count: invited })}</>}
					</p>
				</header>

				{invitesFailed && <Notice tone="warning" title={t('workspaceCreation.WELCOME_INVITES_FAILED')} />}

				<ol className="flex flex-col gap-2" aria-label={t('workspaceCreation.STEPS')}>
					{steps.map(({ href, icon: Icon, title, description }) => (
						<li key={href}>
							<NextLink href={href} className={STEP_CARD}>
								<span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground/[0.04] text-muted-foreground">
									<Icon aria-hidden="true" className="size-4" />
								</span>
								<span className="flex min-w-0 flex-1 flex-col gap-0.5">
									<span className="text-sm font-medium text-foreground">{title}</span>
									<span className="text-xs text-muted-foreground">{description}</span>
								</span>
								<ArrowRight
									aria-hidden="true"
									className="mt-2 size-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5"
								/>
							</NextLink>
						</li>
					))}
				</ol>

				<div className="flex justify-end">
					<Button asChild size="default">
						<NextLink href="/">{t('workspaceCreation.OPEN_WORKSPACE')}</NextLink>
					</Button>
				</div>
			</div>
		</PageLayout>
	);
}
