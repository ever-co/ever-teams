'use client';

import { useIsMemberManager, useLeftSettingData } from '@/core/hooks';
import { User, Users } from '@/core/components/icons';
import { useParams, usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';
import Link from 'next/link';
import { clsxm } from '@/core/lib/utils';
import { activeSettingPersonalTab, activeSettingTeamTab } from '@/core/stores/common/setting';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useEverPlatformSection } from '@/core/hooks/ever-platform/use-ever-platform-section';

type SettingsLink = {
	title: string;
	href: string;
	color?: string;
	managerOnly?: boolean;
	/** The optional Ever Platform section: listed only while it shows. */
	everPlatform?: boolean;
};

const SECTION_ROW_CLASS =
	'flex h-8 items-center rounded-md px-3 text-sm text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25';
const SECTION_ROW_ACTIVE_CLASS = 'bg-foreground/5 font-medium text-foreground';
const SECTION_ROW_DANGER_CLASS = 'text-destructive-ink hover:text-destructive-ink';
const GROUP_LINK_CLASS =
	'flex h-8 items-center gap-2 rounded-md px-3 text-xs font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25';

function ariaCurrentFor(active: boolean): 'location' | undefined {
	if (active) {
		return 'location';
	}
	return undefined;
}

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
	const everPlatform = useEverPlatformSection(Boolean(user) && isTeamManager);
	const isPersonalPage = Boolean(pathname?.endsWith('/settings/personal'));
	const isTeamPage = Boolean(pathname?.endsWith('/settings/team'));

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
			.filter((item) => !item.everPlatform || everPlatform.visible)
			.map((item) => {
				const active = `#${activeHash}` === item.href;
				const isDangerLink = Boolean(item.color) && item.href.includes('danger');
				return (
					<Link
						key={`${scope}-${item.href}`}
						href={`/${locale}/settings/${scope}${item.href}`}
						onClick={onLinkClick}
						aria-current={ariaCurrentFor(active)}
						className={clsxm(
							SECTION_ROW_CLASS,
							active && SECTION_ROW_ACTIVE_CLASS,
							isDangerLink && SECTION_ROW_DANGER_CLASS
						)}
					>
						{item.title}
					</Link>
				);
			});

	return (
		<nav className={clsxm('w-full', className)} aria-label={t('common.SETTINGS')}>
			<div className="flex flex-col gap-4">
				<section>
					<Link
						href={`/${locale}/settings/personal`}
						className={clsxm(GROUP_LINK_CLASS, isPersonalPage && 'text-foreground')}
					>
						<User className="size-4" />
						{t('common.PERSONAL')}
					</Link>
					<div className="mt-1 flex flex-col gap-0.5">
						{renderLinks('personal', PersonalAccordianData, activePersonalMenu)}
					</div>
				</section>
				<section>
					<Link
						href={`/${locale}/settings/team`}
						className={clsxm(GROUP_LINK_CLASS, isTeamPage && 'text-foreground')}
					>
						<Users className="size-4" />
						{t('common.TEAM')}
					</Link>
					<div className="mt-1 flex flex-col gap-0.5">
						{renderLinks('team', TeamAccordianData, activeTeamMenu)}
					</div>
				</section>
			</div>
		</nav>
	);
};
