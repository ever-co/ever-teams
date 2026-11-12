'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';
import { memo } from 'react';
import { ChevronLeft } from '@/core/components/icons';
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar
} from '@/core/components/common/sidebar';
import { EntityTile } from '@/core/components/common/entity-tile';
import { NAV_ROW_ACTIVE_RECIPE, NAV_ROW_RECIPE } from '@/core/components/layouts/nav-row-recipe';
import { cn } from '@/core/lib/helpers';
import { stripLocalePrefix } from '@/core/lib/utils/navigation-path';
import { activeTeamState, canManageActiveTeamState } from '@/core/stores';
import { lastAppPathState } from '@/core/stores/common/setting';
import { TOrganizationTeam } from '@/core/types/schemas';
import { activeSettingsEntry, entriesOfGroup, SettingsEntry, SettingsGroupId } from './settings-entries';

function teamImageOf(team: TOrganizationTeam | null | undefined) {
	const thumbUrl = team?.image?.thumbUrl;
	if (thumbUrl) {
		return thumbUrl;
	}
	return team?.image?.fullUrl ?? '';
}

function ariaCurrentFor(isActive: boolean) {
	if (isActive) {
		return 'page' as const;
	}
	return undefined;
}

function SettingsNavRow({ entry, isActive }: Readonly<{ entry: SettingsEntry; isActive: boolean }>) {
	const t = useTranslations();
	const { state } = useSidebar();
	const isCollapsed = state === 'collapsed';
	const title = t(`settings.entries.${entry.id}.TITLE`);

	return (
		<SidebarMenuItem>
			<SidebarMenuButton
				asChild
				isActive={isActive}
				tooltip={title}
				className={cn(NAV_ROW_RECIPE, isCollapsed && 'justify-center', isActive && NAV_ROW_ACTIVE_RECIPE)}
			>
				<Link href={entry.href} aria-current={ariaCurrentFor(isActive)}>
					<entry.icon className="size-4" />
					<span className={cn('truncate', isCollapsed && 'hidden')}>{title}</span>
				</Link>
			</SidebarMenuButton>
		</SidebarMenuItem>
	);
}

function TeamGroupLabel() {
	const t = useTranslations();
	const activeTeam = useAtomValue(activeTeamState);
	const teamName = activeTeam?.name;

	if (!teamName) {
		return <SidebarGroupLabel>{t('settings.groups.team')}</SidebarGroupLabel>;
	}

	return (
		<SidebarGroupLabel className="gap-2">
			<EntityTile
				name={teamName}
				color={activeTeam?.color}
				imageUrl={teamImageOf(activeTeam)}
				className="size-4 text-[8px]"
			/>
			<span className="truncate">{teamName}</span>
		</SidebarGroupLabel>
	);
}

function SettingsNavGroup({
	group,
	currentHref,
	canManageTeam
}: Readonly<{ group: SettingsGroupId; currentHref: string | null; canManageTeam: boolean }>) {
	const t = useTranslations();
	const entries = entriesOfGroup(group, canManageTeam);
	const isTeamGroup = group === 'team';

	return (
		<SidebarGroup className="py-1">
			{isTeamGroup && <TeamGroupLabel />}
			{!isTeamGroup && <SidebarGroupLabel>{t(`settings.groups.${group}`)}</SidebarGroupLabel>}
			<SidebarMenu className="gap-y-0.5">
				{entries.map((entry) => (
					<SettingsNavRow key={entry.id} entry={entry} isActive={entry.href === currentHref} />
				))}
			</SidebarMenu>
		</SidebarGroup>
	);
}

export const SettingsNav = memo(function SettingsNav() {
	const t = useTranslations();
	const pathname = usePathname();
	const canManageTeam = useAtomValue(canManageActiveTeamState);
	const lastAppPath = useAtomValue(lastAppPathState);
	const { state } = useSidebar();
	const isCollapsed = state === 'collapsed';
	const currentEntry = activeSettingsEntry(stripLocalePrefix(pathname ?? ''));
	const currentHref = currentEntry?.href ?? null;
	const backLabel = t('settings.nav.BACK_TO_APP');

	return (
		<nav aria-label={t('common.SETTINGS')} className="flex flex-col">
			<SidebarGroup className="pb-1">
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							asChild
							tooltip={backLabel}
							className={cn(NAV_ROW_RECIPE, isCollapsed && 'justify-center')}
						>
							<Link href={lastAppPath}>
								<ChevronLeft className="size-4" />
								<span className={cn('truncate', isCollapsed && 'hidden')}>{backLabel}</span>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarGroup>
			<SettingsNavGroup group="account" currentHref={currentHref} canManageTeam={canManageTeam} />
			<SettingsNavGroup group="workspace" currentHref={currentHref} canManageTeam={canManageTeam} />
			<SettingsNavGroup group="team" currentHref={currentHref} canManageTeam={canManageTeam} />
			<SettingsNavGroup group="taskProperties" currentHref={currentHref} canManageTeam={canManageTeam} />
		</nav>
	);
});
