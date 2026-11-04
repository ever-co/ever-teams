'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { useEverConnectActions, useEverConnectData } from '@/core/hooks/ever-platform/use-ever-connect';
import type {
	IEverConnectEntitlementSummary,
	IEverConnectIntegration
} from '@/core/types/interfaces/ever-platform/ever-platform';
import { Button } from '@/core/components/duplicated-components/_button';
import { controlRecipe } from '@/core/components/common/input';
import { cn } from '@/core/lib/helpers';
import { SETTINGS_SURFACE } from '@/core/components/settings/kit/settings-page';

/** A link code from app.ever.co: `EVL-` and three groups of four Crockford base32 characters. */
export const LINK_CODE_PATTERN = /^EVL(-[0-9A-HJKMNP-TV-Z]{4}){3}$/;

/** The query parameter app.ever.co adds when it sends the person back to these settings. */
export const RETURN_PARAM = 'ever_connect_return';

const LINK_CODE_INPUT_CLASS = cn(controlRecipe, 'h-8 min-w-56 flex-1 px-2.5 sm:max-w-xs');
const sectionTitleClass = 'text-[13px] font-medium text-foreground';

type Actions = ReturnType<typeof useEverConnectActions>;

function scopeToggleLabel(showScope: boolean, t: ReturnType<typeof useTranslations>) {
	if (showScope) {
		return t('pages.settingsTeam.everPlatform.HIDE_SCOPE');
	}
	return t('pages.settingsTeam.everPlatform.SHOW_SCOPE');
}

function OrganizationLink({
	handle,
	integrationTenantId,
	actions
}: Readonly<{
	handle: string | null;
	integrationTenantId: string | null;
	actions: Actions;
}>) {
	const t = useTranslations();
	const [code, setCode] = useState('');
	const normalized = code.trim().toUpperCase();
	const valid = LINK_CODE_PATTERN.test(normalized);
	const showsInvalidCode = Boolean(code.trim()) && !valid;

	if (handle !== null || integrationTenantId !== null) {
		return (
			<div className="flex flex-wrap items-center justify-between gap-3" data-testid="ever-connect-link">
				<p className="text-sm text-muted-foreground">
					{t('pages.settingsTeam.everPlatform.CONNECT_LINKED_AS')}{' '}
					<span className="font-medium text-foreground">{handle ? `@${handle}` : '-'}</span>
				</p>
				{integrationTenantId ? (
					<Button
						type="button"
						variant="outline"
						size="default"
						disabled={actions.removeLink.isPending}
						onClick={() => actions.removeLink.mutate(integrationTenantId)}
					>
						{t('pages.settingsTeam.everPlatform.CONNECT_UNLINK')}
					</Button>
				) : null}
			</div>
		);
	}

	return (
		<form
			className="flex flex-col gap-2"
			data-testid="ever-connect-link-form"
			onSubmit={(event) => {
				event.preventDefault();
				if (valid) actions.addLink.mutate(normalized, { onSuccess: () => setCode('') });
			}}
		>
			<p className="text-sm text-muted-foreground">{t('pages.settingsTeam.everPlatform.CONNECT_NOT_LINKED')}</p>
			<label className="text-xs text-muted-foreground" htmlFor="ever-connect-link-code">
				{t('pages.settingsTeam.everPlatform.CONNECT_LINK_CODE_HINT')}
			</label>
			<div className="flex flex-wrap items-center gap-2">
				<input
					id="ever-connect-link-code"
					value={code}
					onChange={(event) => setCode(event.target.value)}
					placeholder="EVL-XXXX-XXXX-XXXX"
					autoComplete="off"
					spellCheck={false}
					className={LINK_CODE_INPUT_CLASS}
				/>
				<Button type="submit" variant="outline" size="default" disabled={!valid || actions.addLink.isPending}>
					{t('pages.settingsTeam.everPlatform.CONNECT_LINK')}
				</Button>
			</div>
			{showsInvalidCode && (
				<p className="text-xs text-destructive-ink">
					{t('pages.settingsTeam.everPlatform.CONNECT_LINK_CODE_INVALID')}
				</p>
			)}
			{actions.addLink.isError ? (
				<p className="text-xs text-destructive-ink">{t('pages.settingsTeam.everPlatform.ACTION_FAILED')}</p>
			) : null}
		</form>
	);
}

function StateChip({ integration }: Readonly<{ integration: IEverConnectIntegration }>) {
	const t = useTranslations();
	let label = t('pages.settingsTeam.everPlatform.STATE_OFF');
	if (integration.state === 'enabled') label = t('pages.settingsTeam.everPlatform.STATE_ENABLED');
	else if (integration.state === 'pending_operator') label = t('pages.settingsTeam.everPlatform.STATE_PENDING');
	else if (integration.policy !== 'allowed') label = t('pages.settingsTeam.everPlatform.STATE_DENIED');
	return (
		<span className="rounded-md bg-foreground/5 px-2 py-0.5 text-xs font-medium text-muted-foreground">
			{label}
		</span>
	);
}

function IntegrationRow({
	integration,
	actions,
	onConsentOpened
}: Readonly<{ integration: IEverConnectIntegration; actions: Actions; onConsentOpened: () => void }>) {
	const t = useTranslations();
	const [showScope, setShowScope] = useState(false);
	// The tab opened for a consent still waiting for its link: closed if this row goes away first.
	const consentTab = useRef<Window | null>(null);
	const mounted = useRef(true);
	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
			consentTab.current?.close();
			consentTab.current = null;
		};
	}, []);
	const canConsent =
		integration.policy === 'allowed' && integration.state !== 'enabled' && integration.state !== 'pending_operator';

	const openConsent = () => {
		// The tab opens during the click (a browser blocks one opened after a request), then goes to the
		// consent page once the paired API answers; it never gets a handle on this page.
		const tab = window.open('', '_blank');
		if (tab) tab.opener = null;
		consentTab.current = tab;
		actions.openConsent.mutate(integration.key, {
			onSuccess: ({ url }) => {
				consentTab.current = null;
				if (!mounted.current) return;
				// The paired API builds this link; it carries no token and no e-mail.
				if (tab) tab.location.href = url;
				else window.location.assign(url);
				onConsentOpened();
			},
			onError: () => {
				consentTab.current = null;
				tab?.close();
			}
		});
	};

	return (
		<li className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0" data-testid="ever-connect-integration">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium text-foreground">{integration.name}</span>
					<StateChip integration={integration} />
				</div>
				<div className="flex flex-wrap gap-2">
					<Button
						type="button"
						variant="outline"
						size="default"
						onClick={() => setShowScope((value) => !value)}
					>
						{scopeToggleLabel(showScope, t)}
					</Button>
					{canConsent ? (
						<Button
							type="button"
							variant="outline"
							size="default"
							disabled={actions.openConsent.isPending}
							onClick={openConsent}
						>
							{t('pages.settingsTeam.everPlatform.MANAGE_IN_APP')}
						</Button>
					) : null}
					{integration.state === 'enabled' ? (
						<Button
							type="button"
							variant="outline"
							size="default"
							disabled={actions.disableIntegration.isPending}
							onClick={() => actions.disableIntegration.mutate(integration.key)}
						>
							{t('pages.settingsTeam.everPlatform.DISABLE')}
						</Button>
					) : null}
				</div>
			</div>
			<p className="text-xs text-muted-foreground">{integration.description}</p>
			{showScope ? (
				<ul className="flex flex-col gap-1 text-xs text-muted-foreground" data-testid="ever-connect-scope">
					{integration.scope.map((row) => (
						<li key={`${row.field_path}-${row.direction}`}>
							<span className="font-mono">{row.field_path}</span> · {row.direction} · {row.frequency} ·{' '}
							{row.purpose} · {row.retention}
						</li>
					))}
				</ul>
			) : null}
		</li>
	);
}

function Entitlement({
	summary,
	actions
}: Readonly<{ summary: IEverConnectEntitlementSummary | null; actions: Actions }>) {
	const t = useTranslations();
	const features = summary ? Object.entries(summary.features).filter(([, on]) => on) : [];
	return (
		<div className="flex flex-col gap-2" data-testid="ever-connect-entitlement">
			{summary ? (
				<dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
					<div>
						<dt className="text-muted-foreground">
							{t('pages.settingsTeam.everPlatform.ENTITLEMENT_PLAN')}
						</dt>
						<dd className="text-foreground">{summary.plan ?? summary.tier ?? '-'}</dd>
					</div>
					<div>
						<dt className="text-muted-foreground">
							{t('pages.settingsTeam.everPlatform.ENTITLEMENT_FEATURES')}
						</dt>
						<dd className="text-foreground">
							{features.length ? features.map(([name]) => name).join(', ') : '-'}
						</dd>
					</div>
					<div>
						<dt className="text-muted-foreground">
							{t('pages.settingsTeam.everPlatform.ENTITLEMENT_EXPIRES')}
						</dt>
						<dd className="text-foreground">{summary.expires_at ?? '-'}</dd>
					</div>
				</dl>
			) : (
				<p className="text-xs text-muted-foreground">{t('pages.settingsTeam.everPlatform.ENTITLEMENT_NONE')}</p>
			)}
			<div>
				<Button
					type="button"
					variant="outline"
					size="default"
					disabled={actions.refreshEntitlement.isPending}
					onClick={() => actions.refreshEntitlement.mutate()}
				>
					{t('pages.settingsTeam.everPlatform.REFRESH')}
				</Button>
			</div>
		</div>
	);
}

/**
 * The Ever Platform connection parts of the team settings, read from the paired API with the
 * signed-in person's own token: the organization's link, its integrations with their data scopes
 * (read only; consent happens in app.ever.co) and its entitlement. The installation's own connection
 * (connect, disconnect, policy) is not here: it belongs to the API's settings.
 */
export function EverConnectPanel({ connected }: Readonly<{ connected: boolean }>) {
	const t = useTranslations();
	const { scope, status, integrations, entitlement } = useEverConnectData(connected);
	const actions = useEverConnectActions(scope.organizationId);
	const refreshedOnReturn = useRef(false);
	const consentOpened = useRef(false);

	useEffect(() => {
		if (!connected || refreshedOnReturn.current) return;
		const params = new URLSearchParams(window.location.search);
		if (params.get(RETURN_PARAM) !== '1') return;
		refreshedOnReturn.current = true;
		actions.refreshIntegrations.mutate();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [connected]);

	// Consent happens in another tab: when the manager comes back to this one, read the integrations again.
	useEffect(() => {
		if (!connected) return;
		const onVisible = () => {
			if (document.visibilityState !== 'visible' || !consentOpened.current) return;
			consentOpened.current = false;
			actions.refreshIntegrations.mutate();
		};
		document.addEventListener('visibilitychange', onVisible);
		return () => document.removeEventListener('visibilitychange', onVisible);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [connected]);

	if (!connected) {
		return (
			<p
				className={cn(SETTINGS_SURFACE, 'px-4 py-3 text-[13px] text-pretty text-muted-foreground')}
				data-testid="ever-connect-not-connected"
			>
				{t('pages.settingsTeam.everPlatform.CONNECT_NOT_CONNECTED')}
			</p>
		);
	}

	const failed = status.isError || integrations.isError || entitlement.isError;
	return (
		<div className={SETTINGS_SURFACE} data-testid="ever-connect-panel">
			<section className="flex flex-col gap-2 px-4 py-4">
				<h3 className={sectionTitleClass}>{t('pages.settingsTeam.everPlatform.CONNECT_LINK_TITLE')}</h3>
				{status.data ? (
					<OrganizationLink
						handle={status.data.link?.handle ?? null}
						integrationTenantId={status.data.link?.integration_tenant_id ?? null}
						actions={actions}
					/>
				) : null}
			</section>
			<section className="flex flex-col gap-2 px-4 py-4">
				<h3 className={sectionTitleClass}>{t('pages.settingsTeam.everPlatform.INTEGRATIONS_TITLE')}</h3>
				{integrations.data && integrations.data.length > 0 ? (
					<ul className="flex flex-col hairline-divide-y divide-border">
						{integrations.data.map((integration: IEverConnectIntegration) => (
							<IntegrationRow
								key={integration.key}
								integration={integration}
								actions={actions}
								onConsentOpened={() => (consentOpened.current = true)}
							/>
						))}
					</ul>
				) : (
					<p className="text-xs text-muted-foreground">
						{t('pages.settingsTeam.everPlatform.INTEGRATIONS_EMPTY')}
					</p>
				)}
			</section>
			<section className="flex flex-col gap-2 px-4 py-4">
				<h3 className={sectionTitleClass}>{t('pages.settingsTeam.everPlatform.ENTITLEMENTS_TITLE')}</h3>
				<Entitlement summary={entitlement.data?.link ?? null} actions={actions} />
			</section>
			{failed ? (
				<p role="alert" className="px-4 py-3 text-xs text-destructive-ink">
					{t('pages.settingsTeam.everPlatform.LOAD_ERROR')}
				</p>
			) : null}
		</div>
	);
}
