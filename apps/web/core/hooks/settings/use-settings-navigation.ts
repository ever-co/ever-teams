'use client';

import { useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { stripLocalePrefix } from '@/core/lib/utils/navigation-path';
import { EVER_CONNECT_RETURN_PARAM } from '@/core/lib/utils/settings-integrations';
import {
	activeSettingsEntry,
	legacySettingsTarget,
	SETTINGS_ROOT,
	SettingsEntry
} from '@/core/components/settings/kit/settings-entries';

interface SettingsCrumb {
	title: string;
	href: string;
}

function useActiveSettingsEntry(): SettingsEntry | null {
	const pathname = usePathname();
	return useMemo(() => activeSettingsEntry(stripLocalePrefix(pathname ?? '')), [pathname]);
}

export function useSettingsBreadcrumb(): SettingsCrumb[] {
	const t = useTranslations();
	const entry = useActiveSettingsEntry();
	const rootCrumb = { title: t('common.SETTINGS'), href: SETTINGS_ROOT };

	if (!entry) {
		return [rootCrumb];
	}
	const groupCrumb = { title: t(`settings.groups.${entry.group}`), href: SETTINGS_ROOT };
	const pageCrumb = { title: t(`settings.entries.${entry.id}.TITLE`), href: entry.href };
	return [rootCrumb, groupCrumb, pageCrumb];
}

function legacyHashTargetOf(path: string, hash: string): string | null {
	if (!hash) {
		return null;
	}
	if (path === '/settings/personal') {
		return legacySettingsTarget('personal', hash);
	}
	if (path === '/settings/team') {
		return legacySettingsTarget('team', hash);
	}
	return null;
}

/** A return from app.ever.co can land on the former team page, whose Ever Platform section is on Integrations now. */
function everConnectReturnTargetOf(path: string, search: string): string | null {
	if (path !== '/settings/team') {
		return null;
	}
	const params = new URLSearchParams(search);
	const returnFlag = params.get(EVER_CONNECT_RETURN_PARAM);
	if (returnFlag !== '1') {
		return null;
	}
	return '/settings/team/integrations';
}

/** The query is kept so the Ever Platform return flag still reaches the page that reads it. */
export function useLegacySettingsHash() {
	const pathname = usePathname();
	const router = useRouter();

	useEffect(() => {
		const redirectLegacyUrl = () => {
			const { hash, search } = window.location;
			const path = stripLocalePrefix(pathname ?? '');
			const hashTarget = legacyHashTargetOf(path, hash);
			const returnTarget = everConnectReturnTargetOf(path, search);
			const target = hashTarget ?? returnTarget;
			if (!target) {
				return;
			}
			router.replace(`${target}${search}`);
		};
		redirectLegacyUrl();
		// A legacy link opened on its own page changes only the hash, which the router does not see
		window.addEventListener('hashchange', redirectLegacyUrl);
		return () => window.removeEventListener('hashchange', redirectLegacyUrl);
	}, [pathname, router]);
}
