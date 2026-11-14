'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { Key } from '@/core/components/icons';
import { SettingsRow } from '@/core/components/settings/kit/settings-page';
import {
	formatUserApiTokenDate,
	userApiTokenExpiryState,
	userApiTokenLastUseState,
	type UserApiTokenExpiryState,
	type UserApiTokenLastUseState
} from '@/core/lib/utils/user-api-tokens';
import type { TUserApiToken } from '@/core/types/schemas/user/user-api-token.schema';

type Translate = ReturnType<typeof useTranslations>;

function lastUseTextOf(state: UserApiTokenLastUseState, t: Translate, locale: string): string {
	if (state.kind === 'never') {
		return t('settings.apiTokens.NEVER_USED');
	}
	return t('settings.apiTokens.LAST_USED_ON', { date: formatUserApiTokenDate(state.date, locale) });
}

function expiryTextOf(state: UserApiTokenExpiryState, t: Translate, locale: string): string {
	if (state.kind === 'never') {
		return t('settings.apiTokens.NEVER_EXPIRES');
	}
	const date = formatUserApiTokenDate(state.date, locale);
	if (state.kind === 'expired') {
		return t('settings.apiTokens.EXPIRED_ON', { date });
	}
	return t('settings.apiTokens.EXPIRES_ON', { date });
}

type ApiTokenRowProps = {
	token: TUserApiToken;
	now: Date;
	onRevoke: (token: TUserApiToken) => void;
};

/** One of the person's tokens: its name, when it was made, last used and ends, and its revocation. Never its secret. */
export function ApiTokenRow({ token, now, onRevoke }: Readonly<ApiTokenRowProps>) {
	const t = useTranslations();
	const locale = useLocale();
	const expiry = userApiTokenExpiryState(token, now);
	const isExpired = expiry.kind === 'expired';
	const facts = [
		t('settings.apiTokens.CREATED_ON', { date: formatUserApiTokenDate(token.createdAt, locale) }),
		lastUseTextOf(userApiTokenLastUseState(token), t, locale),
		expiryTextOf(expiry, t, locale)
	];

	return (
		<SettingsRow
			leading={<Key className="size-4" />}
			label={
				<span className="flex min-w-0 items-center gap-2">
					<span className="truncate" title={token.name}>
						{token.name}
					</span>
					{isExpired && (
						<span className="shrink-0 rounded bg-foreground/5 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
							{t('settings.apiTokens.EXPIRED')}
						</span>
					)}
				</span>
			}
			description={
				<span className="flex flex-wrap gap-x-1.5">
					{facts.map((fact, index) => (
						<span key={fact} className="flex gap-x-1.5">
							{index > 0 && <span aria-hidden="true">·</span>}
							<span>{fact}</span>
						</span>
					))}
				</span>
			}
			className="sm:items-center"
		>
			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={() => onRevoke(token)}
				className="text-destructive-ink hover:bg-destructive/[0.06]"
			>
				{t('settings.apiTokens.REVOKE')}
				<span className="sr-only"> {token.name}</span>
			</Button>
		</SettingsRow>
	);
}
