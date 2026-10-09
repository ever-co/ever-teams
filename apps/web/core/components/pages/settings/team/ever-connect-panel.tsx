'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { useEverConnectActions, useEverConnectData } from '@/core/hooks/ever-platform/use-ever-connect';
import type {
	IEverConnectEntitlementSummary,
	IEverConnectIntegration
} from '@/core/types/interfaces/ever-platform/ever-platform';

/** A link code from app.ever.co: `EVL-` and three groups of four Crockford base32 characters. */
export const LINK_CODE_PATTERN = /^EVL(-[0-9A-HJKMNP-TV-Z]{4}){3}$/;

/** The query parameter app.ever.co adds when it sends the person back to these settings. */
export const RETURN_PARAM = 'ever_connect_return';

const buttonClass =
	'rounded-md border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/60 disabled:opacity-50 dark:border-white/10';

type Actions = ReturnType<typeof useEverConnectActions>;

function OrganizationLink({
	handle,
	integrationTenantId,
	actions
}: {
	handle: string | null;
	integrationTenantId: string | null;
	actions: Actions;
}) {
	const t = useTranslations();
	const [code, setCode] = useState('');
	const normalized = code.trim().toUpperCase();
	const valid = LINK_CODE_PATTERN.test(normalized);

	if (handle !== null || integrationTenantId !== null) {
		return (
			<div className="flex flex-wrap items-center justify-between gap-3" data-testid="ever-connect-link">
				<p className="text-sm">
					{t('pages.settingsTeam.everPlatform.CONNECT_LINKED_AS')}{' '}
					<span className="font-medium text-foreground">{handle ? `ever.co/${handle}` : '-'}</span>
				</p>
				{integrationTenantId ? (
					<button
						type="button"
						className={buttonClass}
						disabled={actions.removeLink.isPending}
						onClick={() => actions.removeLink.mutate(integrationTenantId)}
					>
						{t('pages.settingsTeam.everPlatform.CONNECT_UNLINK')}
					</button>
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
			<p className="text-sm">{t('pages.settingsTeam.everPlatform.CONNECT_NOT_LINKED')}</p>
			<label className="text-xs text-muted-foreground" htmlFor="ever-connect-link-code">
				{t('pages.settingsTeam.everPlatform.CONNECT_LINK_CODE_HINT')}
			</label>
			<div className="flex flex-wrap gap-2">
				<input
					id="ever-connect-link-code"
					value={code}
					onChange={(event) => setCode(event.target.value)}
					placeholder="EVL-XXXX-XXXX-XXXX"
					autoComplete="off"
					spellCheck={false}
					className="min-w-[14rem] flex-1 rounded-md border bg-transparent px-3 py-1.5 text-sm text-foreground dark:border-white/10"
				/>
				<button type="submit" className={buttonClass} disabled={!valid || actions.addLink.isPending}>
					{t('pages.settingsTeam.everPlatform.CONNECT_LINK')}
				</button>
			</div>
			{code.trim() && !valid ? (
				<p className="text-xs text-destructive">{t('pages.settingsTeam.everPlatform.CONNECT_LINK_CODE_INVALID')}</p>
			) : null}
			{actions.addLink.isError ? (
				<p className="text-xs text-destructive">{t('pages.settingsTeam.everPlatform.ACTION_FAILED')}</p>
			) : null}
		</form>
	);
}

function StateChip({ integration }: { integration: IEverConnectIntegration }) {
	const t = useTranslations();
	let label = t('pages.settingsTeam.everPlatform.STATE_OFF');
	if (integration.state === 'enabled') label = t('pages.settingsTeam.everPlatform.STATE_ENABLED');
	else if (integration.state === 'pending_operator') label = t('pages.settingsTeam.everPlatform.STATE_PENDING');
	else if (integration.policy !== 'allowed') label = t('pages.settingsTeam.everPlatform.STATE_DENIED');
	return <span className="rounded-full border px-2 py-0.5 text-[11px] dark:border-white/10">{label}</span>;
}

function IntegrationRow({ integration, actions }: { integration: IEverConnectIntegration; actions: Actions }) {
	const t = useTranslations();
	const [showScope, setShowScope] = useState(false);
	const canConsent =
		integration.policy === 'allowed' && integration.state !== 'enabled' && integration.state !== 'pending_operator';

	const openConsent = () =>
		actions.openConsent.mutate(integration.key, {
			onSuccess: ({ url }) => {
				// The paired API builds this link; it carries no token and no e-mail.
				window.open(url, '_blank', 'noopener,noreferrer');
			}
		});

	return (
		<li className="flex flex-col gap-2 rounded-md border p-3 dark:border-white/10" data-testid="ever-connect-integration">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<span className="font-medium text-foreground">{integration.name}</span>
					<StateChip integration={integration} />
				</div>
				<div className="flex flex-wrap gap-2">
					<button type="button" className={buttonClass} onClick={() => setShowScope((value) => !value)}>
						{showScope
							? t('pages.settingsTeam.everPlatform.HIDE_SCOPE')
							: t('pages.settingsTeam.everPlatform.SHOW_SCOPE')}
					</button>
					{canConsent ? (
						<button type="button" className={buttonClass} disabled={actions.openConsent.isPending} onClick={openConsent}>
							{t('pages.settingsTeam.everPlatform.MANAGE_IN_APP')}
						</button>
					) : null}
					{integration.state === 'enabled' ? (
						<button
							type="button"
							className={buttonClass}
							disabled={actions.disableIntegration.isPending}
							onClick={() => actions.disableIntegration.mutate(integration.key)}
						>
							{t('pages.settingsTeam.everPlatform.DISABLE')}
						</button>
					) : null}
				</div>
			</div>
			<p className="text-xs">{integration.description}</p>
			{showScope ? (
				<ul className="flex flex-col gap-1 text-xs" data-testid="ever-connect-scope">
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

function Entitlement({ summary, actions }: { summary: IEverConnectEntitlementSummary | null; actions: Actions }) {
	const t = useTranslations();
	const features = summary ? Object.entries(summary.features).filter(([, on]) => on) : [];
	return (
		<div className="flex flex-col gap-2" data-testid="ever-connect-entitlement">
			{summary ? (
				<dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
					<div>
						<dt className="text-muted-foreground">{t('pages.settingsTeam.everPlatform.ENTITLEMENT_PLAN')}</dt>
						<dd>{summary.plan ?? summary.tier ?? '-'}</dd>
					</div>
					<div>
						<dt className="text-muted-foreground">{t('pages.settingsTeam.everPlatform.ENTITLEMENT_FEATURES')}</dt>
						<dd>{features.length ? features.map(([name]) => name).join(', ') : '-'}</dd>
					</div>
					<div>
						<dt className="text-muted-foreground">{t('pages.settingsTeam.everPlatform.ENTITLEMENT_EXPIRES')}</dt>
						<dd>{summary.expires_at ?? '-'}</dd>
					</div>
				</dl>
			) : (
				<p className="text-xs">{t('pages.settingsTeam.everPlatform.ENTITLEMENT_NONE')}</p>
			)}
			<div>
				<button
					type="button"
					className={buttonClass}
					disabled={actions.refreshEntitlement.isPending}
					onClick={() => actions.refreshEntitlement.mutate()}
				>
					{t('pages.settingsTeam.everPlatform.REFRESH')}
				</button>
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
export function EverConnectPanel({ connected }: { connected: boolean }) {
	const t = useTranslations();
	const { scope, status, integrations, entitlement } = useEverConnectData(connected);
	const actions = useEverConnectActions(scope.organizationId);
	const refreshedOnReturn = useRef(false);

	useEffect(() => {
		if (!connected || refreshedOnReturn.current) return;
		const params = new URLSearchParams(window.location.search);
		if (params.get(RETURN_PARAM) !== '1') return;
		refreshedOnReturn.current = true;
		actions.refreshIntegrations.mutate();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [connected]);

	if (!connected) {
		return (
			<p className="text-sm" data-testid="ever-connect-not-connected">
				{t('pages.settingsTeam.everPlatform.CONNECT_NOT_CONNECTED')}
			</p>
		);
	}

	const failed = status.isError || integrations.isError || entitlement.isError;
	return (
		<div className="flex flex-col gap-6" data-testid="ever-connect-panel">
			<section className="flex flex-col gap-2">
				<h3 className="text-base font-semibold text-foreground">
					{t('pages.settingsTeam.everPlatform.CONNECT_LINK_TITLE')}
				</h3>
				{status.data ? (
					<OrganizationLink
						handle={status.data.link?.handle ?? null}
						integrationTenantId={status.data.link?.integration_tenant_id ?? null}
						actions={actions}
					/>
				) : null}
			</section>
			<section className="flex flex-col gap-2">
				<h3 className="text-base font-semibold text-foreground">
					{t('pages.settingsTeam.everPlatform.INTEGRATIONS_TITLE')}
				</h3>
				{integrations.data && integrations.data.length > 0 ? (
					<ul className="flex flex-col gap-2">
						{integrations.data.map((integration: IEverConnectIntegration) => (
							<IntegrationRow key={integration.key} integration={integration} actions={actions} />
						))}
					</ul>
				) : (
					<p className="text-xs">{t('pages.settingsTeam.everPlatform.INTEGRATIONS_EMPTY')}</p>
				)}
			</section>
			<section className="flex flex-col gap-2">
				<h3 className="text-base font-semibold text-foreground">
					{t('pages.settingsTeam.everPlatform.ENTITLEMENTS_TITLE')}
				</h3>
				<Entitlement summary={entitlement.data?.link ?? null} actions={actions} />
			</section>
			{failed ? <p className="text-xs text-destructive">{t('pages.settingsTeam.everPlatform.LOAD_ERROR')}</p> : null}
		</div>
	);
}
