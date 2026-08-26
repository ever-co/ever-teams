'use client';

import { useIsMemberManager, useLeftSettingData } from '@/core/hooks';
import { PeoplesIcon, UserOutlineIcon } from 'assets/svg';
import { useParams, usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';
import Link from 'next/link';
import { clsxm } from '@/core/lib/utils';
import { activeSettingPersonalTab, activeSettingTeamTab } from '@/core/stores/common/setting';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';

type SettingsLink = {
	title: string;
	href: string;
	color?: string;
	managerOnly?: boolean;
};

export const LeftSideSettingMenu = ({ className }: { className?: string }) => {
	const t = useTranslations();
	const pathname = usePathname();
	const params = useParams();
	const locale = useMemo(() => params?.locale || '', [params]);
	const activeTeamMenu = useAtomValue(activeSettingTeamTab);
	const activePersonalMenu = useAtomValue(activeSettingPersonalTab);
	const { PersonalAccordianData, TeamAccordianData } = useLeftSettingData();
	const { data: user } = useUserQuery();
	const { isTeamManager } = useIsMemberManager(user);

	useEffect(() => {
		const hash = typeof window !== 'undefined' ? window.location.hash : '';
		if (!hash) return;
		const timer = window.setTimeout(() => document.querySelector(hash)?.scrollIntoView({ block: 'start' }), 100);
		return () => clearTimeout(timer);
	}, [pathname]);

	const onLinkClick = useCallback(
		(e: React.MouseEvent<HTMLAnchorElement>) => {
			const url = new URL(e.currentTarget.href);
			if (url.pathname !== pathname) return;
			const target = document.querySelector(url.hash);
			if (!target) return;
			e.preventDefault();
			target.scrollIntoView({ behavior: 'smooth', block: 'start' });
		},
		[pathname]
	);

	const renderLinks = (scope: 'personal' | 'team', links: SettingsLink[], activeHash: string) =>
		links
			.filter((item) => scope === 'personal' || (!isTeamManager && !item.managerOnly) || isTeamManager)
			.map((item) => {
				const active = `#${activeHash}` === item.href;
				return (
					<Link
						key={`${scope}-${item.href}`}
						href={`/${locale}/settings/${scope}${item.href}`}
						onClick={onLinkClick}
						aria-current={active ? 'location' : undefined}
						className={clsxm(
							'flex min-h-9 items-center rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground',
							active && 'bg-muted font-medium text-foreground'
						)}
						style={item.color && item.href.includes('danger') ? { color: item.color } : undefined}
					>
						{item.title}
					</Link>
				);
			});

	return (
		<nav
			className={clsxm('rounded-xl border bg-card p-2 shadow-sm dark:border-white/10', className)}
			aria-label="Settings"
		>
			<div className="px-3 pb-2 pt-1">
				<h1 className="text-xl font-semibold tracking-tight">{t('common.SETTINGS')}</h1>
				<p className="mt-1 text-xs text-muted-foreground">Manage your workspace preferences</p>
			</div>
			<div className="space-y-4">
				<section>
					<Link
						href={`/${locale}/settings/personal`}
						className={clsxm(
							'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium',
							pathname?.endsWith('/settings/personal') && 'bg-primary/10 text-primary'
						)}
					>
						<UserOutlineIcon className="h-4 w-4" />
						{t('common.PERSONAL')}
					</Link>
					<div className="mt-1 pl-3">
						{renderLinks('personal', PersonalAccordianData, activePersonalMenu)}
					</div>
				</section>
				<section className="border-t pt-3 dark:border-white/10">
					<Link
						href={`/${locale}/settings/team`}
						className={clsxm(
							'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium',
							pathname?.endsWith('/settings/team') && 'bg-primary/10 text-primary'
						)}
					>
						<PeoplesIcon className="h-4 w-4" />
						{t('common.TEAM')}
					</Link>
					<div className="mt-1 pl-3">{renderLinks('team', TeamAccordianData, activeTeamMenu)}</div>
				</section>
			</div>
		</nav>
	);
};
