'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useFormatter, useTranslations } from 'next-intl';
import { APP_NAME } from '@/core/constants/config/constants';
import { Button } from '@/core/components/duplicated-components/_button';
import { Globe } from '@/core/components/icons';
import { ConfirmDestructiveDialog } from '@/core/components/settings/kit/danger';
import {
	SettingsReadOnlyNote,
	SettingsRow,
	SettingsRowSkeleton,
	SettingsSection,
	SettingsSurface
} from '@/core/components/settings/kit/settings-page';
import { useEmbedSiteGrants } from '@/core/hooks/settings/use-embed-site-grants';
import { isSiteGrantAlreadyEnded, renewalEndOf, siteHostOf } from '@/core/lib/utils/embed-site-grants';
import type { EmbedSiteGrant } from '@/core/types/schemas/embeds/embed.schema';

const PLACEHOLDER_ROWS = 2;

type SiteRowProps = {
	grant: EmbedSiteGrant;
	isBusy: boolean;
	onEnd: (grant: EmbedSiteGrant) => void;
};

function SiteRow({ grant, isBusy, onEnd }: Readonly<SiteRowProps>) {
	const t = useTranslations();
	const format = useFormatter();
	const renewalEnd = renewalEndOf(grant);
	let renewsUntil: string | undefined;
	if (renewalEnd) {
		const date = format.dateTime(renewalEnd, { dateStyle: 'medium' });
		renewsUntil = t('settings.allowedSites.RENEWS_UNTIL', { date });
	}

	return (
		<SettingsRow
			leading={<Globe className="size-4" />}
			label={
				<span className="truncate font-mono text-[13px]" title={grant.origin}>
					{grant.origin}
				</span>
			}
			description={renewsUntil}
		>
			<Button
				type="button"
				size="sm"
				variant="outline"
				disabled={isBusy}
				aria-label={`${t('settings.allowedSites.END')}: ${siteHostOf(grant.origin)}`}
				onClick={() => onEnd(grant)}
			>
				{t('settings.allowedSites.END')}
			</Button>
		</SettingsRow>
	);
}

function SitesPlaceholder() {
	const t = useTranslations();
	return (
		<div aria-busy="true" aria-label={t('settings.allowedSites.TITLE')}>
			<SettingsSurface>
				{Array.from({ length: PLACEHOLDER_ROWS }, (_, index) => (
					<SettingsRowSkeleton key={index} leading control="button" labelWidth="w-36" />
				))}
			</SettingsSurface>
		</div>
	);
}

/**
 * Settings > Security > Sites you signed in from: the sites the person allowed to use their timer through their
 * "Sign in with" button, each with the date until which it can renew that sign-in, and a way to end it once
 * confirmed. On a server without embeds (the API answers 404) nothing is shown.
 */
export function AllowedSitesSection() {
	const t = useTranslations();
	const { grants, isLoading, isError, isUnavailable, retry, endSite, endingId } = useEmbedSiteGrants();
	const [ending, setEnding] = useState<EmbedSiteGrant | null>(null);
	const [endFailed, setEndFailed] = useState(false);
	if (isUnavailable) {
		return null;
	}
	const isEnding = endingId !== null;

	const askToEnd = (grant: EmbedSiteGrant) => {
		setEndFailed(false);
		setEnding(grant);
	};

	const closeDialog = () => {
		if (isEnding) {
			return;
		}
		setEndFailed(false);
		setEnding(null);
	};

	const confirmEnd = async () => {
		if (!ending) {
			return;
		}
		const site = siteHostOf(ending.origin);
		setEndFailed(false);
		try {
			await endSite(ending.id);
		} catch (failure) {
			// A sign-in already gone (expired, or ended from another tab) is what the person asked for
			if (!isSiteGrantAlreadyEnded(failure)) {
				setEndFailed(true);
				return;
			}
		}
		setEnding(null);
		toast.success(t('settings.allowedSites.ENDED', { site }));
	};

	let endTitle = '';
	if (ending) {
		endTitle = t('settings.allowedSites.END_TITLE', { site: siteHostOf(ending.origin) });
	}
	let endError: string | null = null;
	if (endFailed) {
		endError = t('settings.allowedSites.END_FAILED');
	}

	let body = (
		<SettingsSurface>
			{grants.map((grant) => (
				<SiteRow key={grant.id} grant={grant} isBusy={isEnding} onEnd={askToEnd} />
			))}
		</SettingsSurface>
	);
	if (grants.length === 0) {
		body = <SettingsReadOnlyNote>{t('settings.allowedSites.EMPTY')}</SettingsReadOnlyNote>;
	}
	if (isLoading) {
		body = <SitesPlaceholder />;
	}
	if (isError) {
		body = (
			<SettingsSurface>
				<SettingsRow label={t('settings.allowedSites.LOAD_FAILED')}>
					<Button type="button" variant="outline" size="sm" onClick={retry}>
						{t('settings.allowedSites.RETRY')}
					</Button>
				</SettingsRow>
			</SettingsSurface>
		);
	}

	return (
		<SettingsSection
			id="allowed-sites"
			title={t('settings.allowedSites.TITLE')}
			description={t('settings.allowedSites.DESCRIPTION', { appName: APP_NAME })}
		>
			{body}
			<ConfirmDestructiveDialog
				open={ending !== null}
				onClose={closeDialog}
				title={endTitle}
				description={t('settings.allowedSites.END_DESCRIPTION', { appName: APP_NAME })}
				confirmLabel={t('settings.allowedSites.END')}
				isPending={isEnding}
				error={endError}
				onConfirm={() => void confirmEnd()}
			/>
		</SettingsSection>
	);
}
