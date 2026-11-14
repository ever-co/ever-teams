'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Notice } from '@/core/components/common/notice';
import { Button } from '@/core/components/duplicated-components/_button';
import { Key, Plus } from '@/core/components/icons';
import {
	SETTINGS_SURFACE,
	SettingsPage,
	SettingsReadOnlyNote,
	SettingsRowSkeleton,
	SettingsSection,
	SettingsSectionSkeleton,
	SettingsSurface
} from '@/core/components/settings/kit/settings-page';
import {
	useUserApiTokens,
	useUserApiTokensAvailability,
	useUserApiTokensClock,
	type UserApiTokensAvailability
} from '@/core/hooks/settings/use-user-api-tokens';
import {
	activeUserApiTokenCount,
	canCreateUserApiToken,
	MAX_ACTIVE_USER_API_TOKENS,
	sortUserApiTokens
} from '@/core/lib/utils/user-api-tokens';
import type { TUserApiToken } from '@/core/types/schemas/user/user-api-token.schema';
import { ApiTokenRow } from './api-token-row';
import { ApiTokenUsageSection } from './api-token-usage-section';
import { CreateApiTokenDialog } from './create-api-token-dialog';
import { RevokeApiTokenDialog } from './revoke-api-token-dialog';

function TokenRowsSkeleton() {
	return (
		<div className={SETTINGS_SURFACE} aria-busy="true">
			<SettingsRowSkeleton control="button" leading labelWidth="w-36" />
			<SettingsRowSkeleton control="button" leading labelWidth="w-28" />
		</div>
	);
}

function EmptyTokens({ onCreate }: Readonly<{ onCreate: () => void }>) {
	const t = useTranslations();
	return (
		<SettingsSurface>
			<div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
				<span
					aria-hidden="true"
					className="flex size-9 items-center justify-center rounded-full bg-foreground/5 text-muted-foreground [&_svg]:size-4"
				>
					<Key />
				</span>
				<div className="flex max-w-sm flex-col gap-1">
					<p className="text-[13px] font-medium text-balance text-foreground">
						{t('settings.apiTokens.EMPTY_TITLE')}
					</p>
					<p className="text-xs text-pretty text-muted-foreground">{t('settings.apiTokens.EMPTY_TEXT')}</p>
				</div>
				<Button type="button" variant="outline" size="sm" onClick={onCreate}>
					<Plus />
					{t('settings.apiTokens.CREATE')}
				</Button>
			</div>
		</SettingsSurface>
	);
}

/** The person's tokens, the way to create one and to revoke one; asked for only once the server offers them. */
function ApiTokensSection() {
	const t = useTranslations();
	const { tokens, isLoading, isError, refetch } = useUserApiTokens(true);
	const now = useUserApiTokensClock(tokens);
	// The expiry choices are dated from when the dialog opens, not from when the page did.
	const [createOpenedAt, setCreateOpenedAt] = useState<Date | null>(null);
	const [revoking, setRevoking] = useState<TUserApiToken | null>(null);
	const sortedTokens = useMemo(() => sortUserApiTokens(tokens, now), [tokens, now]);

	const isReady = !isLoading && !isError;
	const hasTokens = isReady && tokens.length > 0;
	const isEmpty = isReady && tokens.length === 0;
	const isLimitReached = isReady && !canCreateUserApiToken(tokens, now);
	const canOpenCreate = isReady && !isLimitReached;

	let description: string | undefined;
	if (hasTokens) {
		description = t('settings.apiTokens.COUNT', {
			count: activeUserApiTokenCount(tokens, now),
			max: MAX_ACTIVE_USER_API_TOKENS
		});
	}

	const openCreate = () => setCreateOpenedAt(new Date());

	return (
		<SettingsSection
			id="api-tokens"
			title={t('settings.apiTokens.SECTION_TOKENS')}
			description={description}
			actions={
				<Button type="button" size="sm" onClick={openCreate} disabled={!canOpenCreate}>
					<Plus />
					{t('settings.apiTokens.CREATE')}
				</Button>
			}
		>
			{isLoading && <TokenRowsSkeleton />}
			{isError && (
				<Notice
					tone="error"
					title={t('settings.apiTokens.LIST_FAILED_TITLE')}
					description={t('settings.apiTokens.LIST_FAILED_TEXT')}
					actions={
						<Button type="button" size="sm" variant="outline" onClick={() => refetch()}>
							{t('settings.apiTokens.RETRY')}
						</Button>
					}
				/>
			)}
			{isEmpty && <EmptyTokens onCreate={openCreate} />}
			{hasTokens && (
				<SettingsSurface>
					{sortedTokens.map((token) => (
						<ApiTokenRow key={token.id} token={token} now={now} onRevoke={setRevoking} />
					))}
				</SettingsSurface>
			)}
			{isLimitReached && (
				<SettingsReadOnlyNote>
					{t('settings.apiTokens.LIMIT_REACHED', { max: MAX_ACTIVE_USER_API_TOKENS })}
				</SettingsReadOnlyNote>
			)}
			<CreateApiTokenDialog
				open={createOpenedAt !== null}
				onClose={() => setCreateOpenedAt(null)}
				now={createOpenedAt ?? now}
			/>
			<RevokeApiTokenDialog token={revoking} onClose={() => setRevoking(null)} />
		</SettingsSection>
	);
}

function ApiTokensBody({
	availability,
	onRetry
}: Readonly<{ availability: UserApiTokensAvailability; onRetry: () => void }>) {
	const t = useTranslations();
	if (availability === 'loading') {
		return (
			<SettingsSectionSkeleton title={t('settings.apiTokens.SECTION_TOKENS')} rows={2} control="button" leading />
		);
	}
	if (availability === 'error') {
		return (
			<Notice
				tone="error"
				title={t('settings.apiTokens.AVAILABILITY_FAILED_TITLE')}
				description={t('settings.apiTokens.LIST_FAILED_TEXT')}
				actions={
					<Button type="button" size="sm" variant="outline" onClick={onRetry}>
						{t('settings.apiTokens.RETRY')}
					</Button>
				}
			/>
		);
	}
	if (availability === 'disabled') {
		return (
			<Notice
				tone="neutral"
				title={t('settings.apiTokens.UNAVAILABLE_TITLE')}
				description={t('settings.apiTokens.UNAVAILABLE_TEXT')}
			/>
		);
	}
	return (
		<>
			<ApiTokensSection />
			<ApiTokenUsageSection />
		</>
	);
}

/**
 * Settings → API tokens: the person's own personal API tokens. The server is asked first whether it has them on
 * (`GET /user-api-tokens/config`); until it says yes, no token route is called.
 */
export function ApiTokensSettingsPage() {
	const t = useTranslations();
	const { availability, retry } = useUserApiTokensAvailability();
	return (
		<SettingsPage
			title={t('settings.entries.apiTokens.TITLE')}
			description={t('settings.apiTokens.PAGE_DESCRIPTION')}
		>
			<ApiTokensBody availability={availability} onRetry={() => retry()} />
		</SettingsPage>
	);
}
