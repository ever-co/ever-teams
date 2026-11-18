'use client';

import { FormEvent, useId, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Input } from '@/core/components/common/input';
import { Notice } from '@/core/components/common/notice';
import { Button } from '@/core/components/duplicated-components/_button';
import { Globe, Key, Plus, Spinner } from '@/core/components/icons';
import { ConfirmDestructiveDialog } from '@/core/components/settings/kit/danger';
import {
	SETTINGS_SURFACE,
	SettingsPage,
	SettingsRow,
	SettingsRowSkeleton,
	SettingsSection,
	SettingsSectionSkeleton,
	SettingsSurface
} from '@/core/components/settings/kit/settings-page';
import { useActiveClients } from '@/core/hooks/clients/use-clients-query';
import {
	useAddEmbedOrigin,
	useEmbedAllowedOrigins,
	useEmbedCredentials,
	useEmbedsAvailability,
	useRemoveEmbedOrigin,
	useRevokeEmbedCredential,
	type EmbedsAvailability
} from '@/core/hooks/settings/use-embeds';
import { errorStatusOf } from '@/core/lib/utils/error-feedback';
import { formatUserApiTokenDate } from '@/core/lib/utils/user-api-tokens';
import { cn } from '@/core/lib/helpers';
import { isOriginLike, type EmbedAllowedOrigin, type EmbedCredential } from '@/core/types/schemas/embeds/embed.schema';
import { CreateEmbedCredentialDialog } from './create-embed-credential-dialog';

function RowsSkeleton() {
	return (
		<div className={SETTINGS_SURFACE} aria-busy="true">
			<SettingsRowSkeleton control="button" leading labelWidth="w-40" />
			<SettingsRowSkeleton control="button" leading labelWidth="w-32" />
		</div>
	);
}

function ListFailed({ onRetry }: Readonly<{ onRetry: () => void }>) {
	const t = useTranslations();
	return (
		<Notice
			tone="error"
			title={t('settings.embeds.LIST_FAILED_TITLE')}
			description={t('settings.embeds.LIST_FAILED_TEXT')}
			actions={
				<Button type="button" size="sm" variant="outline" onClick={onRetry}>
					{t('settings.embeds.RETRY')}
				</Button>
			}
		/>
	);
}

function EmptyList({ text }: Readonly<{ text: string }>) {
	return (
		<SettingsSurface>
			<p className="px-4 py-6 text-center text-xs text-pretty text-muted-foreground">{text}</p>
		</SettingsSurface>
	);
}

/** Adds a site: checked as an origin here first, then by the platform, which normalizes it. */
function AddOriginForm() {
	const t = useTranslations();
	const inputId = useId();
	const noteId = useId();
	const add = useAddEmbedOrigin();
	const [value, setValue] = useState('');
	const [isInvalid, setIsInvalid] = useState(false);

	const submit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!isOriginLike(value)) {
			setIsInvalid(true);
			return;
		}
		setIsInvalid(false);
		add.mutate(value, { onSuccess: () => setValue('') });
	};

	const refusedByPlatform = add.isError && errorStatusOf(add.error) === 400;
	let note = t('settings.embeds.ORIGIN_HINT');
	if (isInvalid || refusedByPlatform) {
		note = t('settings.embeds.ORIGIN_INVALID');
	}
	const failed = add.isError && !refusedByPlatform;

	return (
		<form onSubmit={submit} noValidate className="flex flex-col gap-1.5">
			<label htmlFor={inputId} className="text-xs font-medium text-foreground">
				{t('settings.embeds.ORIGIN_LABEL')}
			</label>
			<div className="flex flex-col gap-2 sm:flex-row">
				<Input
					id={inputId}
					value={value}
					onChange={(event) => {
						setValue(event.target.value);
						setIsInvalid(false);
						// The platform's refusal was of the previous value: the edited one has not been judged yet.
						if (add.isError) {
							add.reset();
						}
					}}
					placeholder="https://app.example.com"
					inputMode="url"
					autoComplete="off"
					spellCheck={false}
					aria-invalid={isInvalid || refusedByPlatform}
					aria-describedby={noteId}
					disabled={add.isPending}
					className="sm:flex-1"
				/>
				<Button type="submit" size="sm" disabled={add.isPending} className="sm:self-center">
					{add.isPending && <Spinner className="animate-spin" aria-hidden="true" />}
					{!add.isPending && <Plus />}
					{t('settings.embeds.ADD_ORIGIN')}
				</Button>
			</div>
			<p
				id={noteId}
				className={cn(
					'text-xs text-muted-foreground',
					(isInvalid || refusedByPlatform) && 'text-destructive-ink'
				)}
			>
				{note}
			</p>
			{failed && <Notice tone="error" title={t('settings.embeds.ADD_ORIGIN_FAILED')} />}
		</form>
	);
}

function OriginRow({
	row,
	onRemove
}: Readonly<{ row: EmbedAllowedOrigin; onRemove: (row: EmbedAllowedOrigin) => void }>) {
	const t = useTranslations();
	const locale = useLocale();
	let description: string | undefined;
	if (row.createdAt) {
		description = t('settings.embeds.ADDED_ON', { date: formatUserApiTokenDate(row.createdAt, locale) });
	}
	return (
		<SettingsRow
			leading={<Globe className="size-4" />}
			label={
				<span className="truncate font-mono text-[13px]" title={row.origin}>
					{row.origin}
				</span>
			}
			description={description}
		>
			<Button type="button" size="sm" variant="outline" onClick={() => onRemove(row)}>
				{t('settings.embeds.REMOVE')}
			</Button>
		</SettingsRow>
	);
}

/** The sites allowed to embed the organization's timer: an embed token works only from one of them. */
function AllowedOriginsSection() {
	const t = useTranslations();
	const { origins, isLoading, isError, refetch } = useEmbedAllowedOrigins(true);
	const remove = useRemoveEmbedOrigin();
	const [removing, setRemoving] = useState<EmbedAllowedOrigin | null>(null);
	const [removeFailed, setRemoveFailed] = useState(false);
	const isReady = !isLoading && !isError;

	const closeRemove = () => {
		if (remove.isPending) {
			return;
		}
		setRemoveFailed(false);
		setRemoving(null);
	};
	const confirmRemove = () => {
		if (!removing) {
			return;
		}
		setRemoveFailed(false);
		remove.mutate(removing.id, {
			onSuccess: () => setRemoving(null),
			onError: () => setRemoveFailed(true)
		});
	};

	let removeTitle = '';
	if (removing) {
		removeTitle = t('settings.embeds.REMOVE_TITLE', { origin: removing.origin });
	}
	let removeError: string | null = null;
	if (removeFailed) {
		removeError = t('settings.embeds.REMOVE_FAILED');
	}

	return (
		<SettingsSection
			id="embed-origins"
			title={t('settings.embeds.SECTION_ORIGINS')}
			description={t('settings.embeds.SECTION_ORIGINS_TEXT')}
		>
			<AddOriginForm />
			{isLoading && <RowsSkeleton />}
			{isError && <ListFailed onRetry={() => refetch()} />}
			{isReady && origins.length === 0 && <EmptyList text={t('settings.embeds.NO_ORIGINS')} />}
			{isReady && origins.length > 0 && (
				<SettingsSurface>
					{origins.map((row) => (
						<OriginRow key={row.id} row={row} onRemove={setRemoving} />
					))}
				</SettingsSurface>
			)}
			<ConfirmDestructiveDialog
				open={removing !== null}
				onClose={closeRemove}
				title={removeTitle}
				description={t('settings.embeds.REMOVE_DESCRIPTION')}
				confirmLabel={t('settings.embeds.REMOVE')}
				isPending={remove.isPending}
				error={removeError}
				onConfirm={confirmRemove}
			/>
		</SettingsSection>
	);
}

/**
 * The client a credential is limited to, by its name among the active clients; one they do not hold (archived, or
 * not read yet) is not named, and its id is never shown.
 */
function clientFactOf(
	clientId: string | null | undefined,
	clientNames: ReadonlyMap<string, string>,
	t: Translate
): string | null {
	if (!clientId) {
		return null;
	}
	const clientName = clientNames.get(clientId);
	if (clientName) {
		return t('settings.embeds.LIMITED_TO_CLIENT', { client: clientName });
	}
	return t('settings.embeds.LIMITED_TO_ONE_CLIENT');
}

type CredentialRowProps = {
	row: EmbedCredential;
	clientNames: ReadonlyMap<string, string>;
	onRevoke: (row: EmbedCredential) => void;
};

function CredentialRow({ row, clientNames, onRevoke }: Readonly<CredentialRowProps>) {
	const t = useTranslations();
	const locale = useLocale();
	const facts = [row.prefix];
	const clientFact = clientFactOf(row.organizationContactId, clientNames, t);
	if (clientFact) {
		facts.push(clientFact);
	}
	if (row.canAddMembers) {
		facts.push(t('settings.embeds.ADDS_MEMBERS'));
	}
	if (row.createdAt) {
		facts.push(t('settings.embeds.CREATED_ON', { date: formatUserApiTokenDate(row.createdAt, locale) }));
	}
	let lastUse = t('settings.embeds.NEVER_USED');
	if (row.lastUsedAt) {
		lastUse = t('settings.embeds.LAST_USED_ON', { date: formatUserApiTokenDate(row.lastUsedAt, locale) });
	}
	facts.push(lastUse);
	return (
		<SettingsRow
			leading={<Key className="size-4" />}
			label={
				<span className="truncate" title={row.name}>
					{row.name}
				</span>
			}
			description={
				<span className="flex flex-wrap gap-x-1.5">
					{facts.map((fact, index) => (
						<span key={fact}>
							{index > 0 && <span aria-hidden="true">· </span>}
							{fact}
						</span>
					))}
				</span>
			}
		>
			<Button type="button" size="sm" variant="outline" onClick={() => onRevoke(row)}>
				{t('settings.embeds.REVOKE')}
			</Button>
		</SettingsRow>
	);
}

type CredentialsSectionProps = {
	canLimitToClient: boolean;
	canAllowAddMembers: boolean;
};

/**
 * The credentials the organization's hosts exchange on their servers for timer-only tokens; a new one may be limited
 * to one client, and may add the people it signs in, when the server can.
 */
function CredentialsSection({ canLimitToClient, canAllowAddMembers }: Readonly<CredentialsSectionProps>) {
	const t = useTranslations();
	const { credentials, isLoading, isError, refetch } = useEmbedCredentials(true);
	// The clients are read only to name the ones credentials are limited to
	const isAnyLimitedToClient = credentials.some((row) => Boolean(row.organizationContactId));
	const { clients } = useActiveClients({ enabled: isAnyLimitedToClient });
	const clientNames = useMemo(() => new Map(clients.map((client) => [client.id, client.name])), [clients]);
	const revoke = useRevokeEmbedCredential();
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [revoking, setRevoking] = useState<EmbedCredential | null>(null);
	const [revokeFailed, setRevokeFailed] = useState(false);
	const isReady = !isLoading && !isError;

	const closeRevoke = () => {
		if (revoke.isPending) {
			return;
		}
		setRevokeFailed(false);
		setRevoking(null);
	};
	const confirmRevoke = () => {
		if (!revoking) {
			return;
		}
		setRevokeFailed(false);
		revoke.mutate(revoking.id, {
			onSuccess: () => setRevoking(null),
			onError: () => setRevokeFailed(true)
		});
	};

	let revokeTitle = '';
	if (revoking) {
		revokeTitle = t('settings.embeds.REVOKE_TITLE', { name: revoking.name });
	}
	let revokeError: string | null = null;
	if (revokeFailed) {
		revokeError = t('settings.embeds.REVOKE_FAILED');
	}

	return (
		<SettingsSection
			id="embed-credentials"
			title={t('settings.embeds.SECTION_CREDENTIALS')}
			description={t('settings.embeds.SECTION_CREDENTIALS_TEXT')}
			actions={
				<Button type="button" size="sm" onClick={() => setIsCreateOpen(true)} disabled={!isReady}>
					<Plus />
					{t('settings.embeds.CREATE')}
				</Button>
			}
		>
			{isLoading && <RowsSkeleton />}
			{isError && <ListFailed onRetry={() => refetch()} />}
			{isReady && credentials.length === 0 && <EmptyList text={t('settings.embeds.NO_CREDENTIALS')} />}
			{isReady && credentials.length > 0 && (
				<SettingsSurface>
					{credentials.map((row) => (
						<CredentialRow key={row.id} row={row} clientNames={clientNames} onRevoke={setRevoking} />
					))}
				</SettingsSurface>
			)}
			<CreateEmbedCredentialDialog
				open={isCreateOpen}
				canLimitToClient={canLimitToClient}
				canAllowAddMembers={canAllowAddMembers}
				onClose={() => setIsCreateOpen(false)}
			/>
			<ConfirmDestructiveDialog
				open={revoking !== null}
				onClose={closeRevoke}
				title={revokeTitle}
				description={t('settings.embeds.REVOKE_DESCRIPTION')}
				confirmLabel={t('settings.embeds.REVOKE')}
				isPending={revoke.isPending}
				error={revokeError}
				onConfirm={confirmRevoke}
			/>
		</SettingsSection>
	);
}

type Translate = ReturnType<typeof useTranslations>;

/** What the page says instead of its lists: a failed check (with a retry), members only, or embeds off. */
function availabilityNoticeOf(availability: EmbedsAvailability, t: Translate, onRetry: () => void) {
	switch (availability) {
		case 'error':
			return {
				tone: 'error' as const,
				title: t('settings.embeds.AVAILABILITY_FAILED_TITLE'),
				description: t('settings.embeds.LIST_FAILED_TEXT'),
				actions: (
					<Button type="button" size="sm" variant="outline" onClick={onRetry}>
						{t('settings.embeds.RETRY')}
					</Button>
				)
			};
		case 'forbidden':
			return {
				tone: 'neutral' as const,
				title: t('settings.embeds.ADMINS_ONLY_TITLE'),
				description: t('settings.embeds.ADMINS_ONLY_TEXT')
			};
		case 'disabled':
			return {
				tone: 'neutral' as const,
				title: t('settings.embeds.UNAVAILABLE_TITLE'),
				description: t('settings.embeds.UNAVAILABLE_TEXT', { variable: 'GAUZY_EMBED_TOKENS_ENABLED' })
			};
		default:
			return null;
	}
}

type EmbedsBodyProps = {
	availability: EmbedsAvailability;
	canLimitToClient: boolean;
	canAllowAddMembers: boolean;
	onRetry: () => void;
};

function EmbedsBody({ availability, canLimitToClient, canAllowAddMembers, onRetry }: Readonly<EmbedsBodyProps>) {
	const t = useTranslations();
	if (availability === 'loading') {
		return (
			<SettingsSectionSkeleton title={t('settings.embeds.SECTION_ORIGINS')} rows={2} control="button" leading />
		);
	}
	const notice = availabilityNoticeOf(availability, t, onRetry);
	if (notice) {
		return <Notice {...notice} />;
	}
	return (
		<>
			<AllowedOriginsSection />
			<CredentialsSection canLimitToClient={canLimitToClient} canAllowAddMembers={canAllowAddMembers} />
		</>
	);
}

/**
 * Settings → Embeds: the sites allowed to embed the organization's timer, and the credentials its hosts' backends use.
 * The server is asked first whether embeds are on (`GET /embed-credentials/config`, for administrators); until it says
 * yes, no other embed route is called.
 */
export function EmbedsSettingsPage() {
	const t = useTranslations();
	const { availability, canLimitToClient, canAllowAddMembers, retry } = useEmbedsAvailability();
	return (
		<SettingsPage title={t('settings.entries.embeds.TITLE')} description={t('settings.embeds.PAGE_DESCRIPTION')}>
			<EmbedsBody
				availability={availability}
				canLimitToClient={canLimitToClient}
				canAllowAddMembers={canAllowAddMembers}
				onRetry={() => retry()}
			/>
		</SettingsPage>
	);
}
