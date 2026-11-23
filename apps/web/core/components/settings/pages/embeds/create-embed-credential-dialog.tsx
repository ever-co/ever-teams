'use client';

import { ChangeEvent, FormEvent, useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { APP_DIALOG_BODY, APP_DIALOG_FOOTER, AppDialog, AppDialogHeader } from '@/core/components/common/app-dialog';
import { Checkbox } from '@/core/components/common/checkbox';
import { Input } from '@/core/components/common/input';
import { Notice } from '@/core/components/common/notice';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/core/components/common/select';
import { Button } from '@/core/components/duplicated-components/_button';
import { Spinner } from '@/core/components/icons';
import { ApiTokenSecret } from '@/core/components/settings/pages/api-tokens/api-token-secret';
import { useActiveClients } from '@/core/hooks/clients/use-clients-query';
import { useCreateEmbedCredential } from '@/core/hooks/settings/use-embeds';
import { cn } from '@/core/lib/helpers';
import { EmbedMembersNotAddedError } from '@/core/services/client/api/embeds/embeds.service';
import {
	EMBED_CREDENTIAL_NAME_MAX_LENGTH,
	type CreatedEmbedCredential,
	type EmbedCredentialInput
} from '@/core/types/schemas/embeds/embed.schema';

type Translate = ReturnType<typeof useTranslations>;

// The select's value for no client: the empty string would read as nothing chosen, and a client id is a UUID
const WHOLE_WORKSPACE = 'whole-workspace';

function selectValueOf(clientId: string | null): string {
	if (clientId) {
		return clientId;
	}
	return WHOLE_WORKSPACE;
}

function clientIdOf(value: string): string | null {
	const isWholeWorkspace = !value || value === WHOLE_WORKSPACE;
	if (isWholeWorkspace) {
		return null;
	}
	return value;
}

interface ClientsRead {
	isLoading: boolean;
	isError: boolean;
	hasNoClients: boolean;
}

function clientNoteOf(read: ClientsRead, t: Translate): string {
	if (read.isLoading) {
		return t('settings.embeds.CLIENT_LOADING');
	}
	if (read.isError) {
		return t('settings.embeds.CLIENT_FAILED');
	}
	if (read.hasNoClients) {
		return t('settings.embeds.CLIENT_EMPTY');
	}
	return t('settings.embeds.CLIENT_HINT');
}

type ClientOption = { id: string; name: string };

/**
 * The clients the field offers: the active ones, and the one chosen if it has left them since (archived, say). The
 * choice then stays as it was, in sight, until the person changes it: it never turns into the whole workspace on its
 * own. The API decides whether that client can still be used.
 */
function offeredClientsOf<T extends ClientOption>(clients: T[], chosen: T | null): T[] {
	if (!chosen || clients.some((client) => client.id === chosen.id)) {
		return clients;
	}
	return [...clients, chosen];
}

type ClientFieldProps = {
	clientId: string | null;
	onChange: (clientId: string | null) => void;
	disabled: boolean;
};

/**
 * The one client a credential may be limited to, among the workspace's active clients, after the whole workspace.
 * While the clients load, or when they cannot be read, the whole workspace stays the choice and the credential can
 * still be created.
 */
function CredentialClientField({ clientId, onChange, disabled }: Readonly<ClientFieldProps>) {
	const t = useTranslations();
	const fieldId = useId();
	const noteId = useId();
	const { clients, isLoading, isError, refetch } = useActiveClients();
	const isRead = !isLoading && !isError;
	const [chosen, setChosen] = useState<(typeof clients)[number] | null>(null);
	const offered = offeredClientsOf(clients, clientId === null ? null : chosen);
	const hasNoClients = isRead && clients.length === 0;
	// A client already chosen can still be changed back to the whole workspace
	const isDisabled = disabled || (hasNoClients && clientId === null);
	const note = clientNoteOf({ isLoading, isError, hasNoClients }, t);
	const choose = (value: string) => {
		const nextClientId = clientIdOf(value);
		setChosen(offered.find((client) => client.id === nextClientId) ?? null);
		onChange(nextClientId);
	};

	return (
		<div className="flex flex-col gap-1.5">
			<label className="text-xs font-medium text-foreground" htmlFor={fieldId}>
				{t('settings.embeds.CLIENT_LABEL')}
			</label>
			<Select value={selectValueOf(clientId)} onValueChange={choose} disabled={isDisabled}>
				<SelectTrigger id={fieldId} aria-describedby={noteId} aria-busy={isLoading}>
					<SelectValue />
					{isLoading && (
						<Spinner className="ml-auto size-3.5 animate-spin text-muted-foreground" aria-hidden="true" />
					)}
				</SelectTrigger>
				<SelectContent className="max-h-72">
					<SelectItem value={WHOLE_WORKSPACE}>{t('settings.embeds.CLIENT_WHOLE_WORKSPACE')}</SelectItem>
					{offered.map((client) => (
						<SelectItem key={client.id} value={client.id} textValue={client.name}>
							<span className="min-w-0 truncate">{client.name}</span>
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<div className="flex items-start justify-between gap-2">
				<p className="text-xs text-pretty text-muted-foreground" id={noteId} role="status">
					{note}
				</p>
				{isError && (
					<Button type="button" size="sm" variant="outline" onClick={() => refetch()} disabled={disabled}>
						{t('settings.embeds.RETRY')}
					</Button>
				)}
			</div>
		</div>
	);
}

type AddMembersFieldProps = {
	checked: boolean;
	onChange: (checked: boolean) => void;
	disabled: boolean;
};

/** Whether the credential adds the people its site signs in who are not members yet, as employees. */
function AddMembersField({ checked, onChange, disabled }: Readonly<AddMembersFieldProps>) {
	const t = useTranslations();
	const hintId = useId();
	return (
		<div className="flex flex-col gap-1.5">
			<label className="flex items-start gap-2 text-xs font-medium text-foreground">
				<Checkbox
					checked={checked}
					onCheckedChange={(next) => onChange(next === true)}
					disabled={disabled}
					aria-describedby={hintId}
				/>
				{t('settings.embeds.ADD_MEMBERS_LABEL')}
			</label>
			<p className="pl-6 text-xs text-pretty text-muted-foreground" id={hintId}>
				{t('settings.embeds.ADD_MEMBERS_HINT')}
			</p>
		</div>
	);
}

/**
 * What the dialog says when the credential was not created: a server that would not let it add members gets its own
 * words, since trying again as it was would fail the same way, and never says the credential was revoked when the
 * revocation failed: it is then still in the list, to revoke there.
 */
function createFailureOf(error: unknown, t: Translate): string {
	if (error instanceof EmbedMembersNotAddedError) {
		return error.isRevoked ? t('settings.embeds.ADD_MEMBERS_FAILED') : t('settings.embeds.ADD_MEMBERS_NOT_REVOKED');
	}
	return t('settings.embeds.CREATE_FAILED');
}

type CreateFormProps = {
	create: ReturnType<typeof useCreateEmbedCredential>;
	canLimitToClient: boolean;
	canAllowAddMembers: boolean;
	onCancel: () => void;
	onCreated: (created: CreatedEmbedCredential) => void;
};

function CreateCredentialForm({
	create,
	canLimitToClient,
	canAllowAddMembers,
	onCancel,
	onCreated
}: Readonly<CreateFormProps>) {
	const t = useTranslations();
	const nameId = useId();
	const nameNoteId = useId();
	const [name, setName] = useState('');
	const [clientId, setClientId] = useState<string | null>(null);
	// Kept while a client is chosen, even if the config read again says the API can no longer limit a credential: the
	// choice stays in sight and can be changed, never widened behind the person's back
	const isClientFieldShown = canLimitToClient || clientId !== null;
	const [canAddMembers, setCanAddMembers] = useState(false);
	// Kept while ticked, for the same reason: the option is never dropped behind the person's back
	const isAddMembersFieldShown = canAllowAddMembers || canAddMembers;
	const [isNameMissing, setIsNameMissing] = useState(false);
	const isCreating = create.isPending;

	const submit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!name.trim()) {
			setIsNameMissing(true);
			return;
		}
		setIsNameMissing(false);
		// A chosen client is always sent, never dropped: the service refuses a credential the API did not limit to it
		const input: EmbedCredentialInput = { name, organizationContactId: clientId };
		if (canAddMembers) {
			input.canAddMembers = true;
		}
		create.mutate(input, { onSuccess: onCreated });
	};

	let nameNote = t('settings.embeds.NAME_HINT');
	if (isNameMissing) {
		nameNote = t('settings.embeds.NAME_REQUIRED');
	}
	let submitLabel = t('settings.embeds.CREATE');
	if (isCreating) {
		submitLabel = t('settings.embeds.CREATING');
	}
	const noteClassName = cn('text-xs text-muted-foreground', isNameMissing && 'text-destructive-ink');
	const changeName = (event: ChangeEvent<HTMLInputElement>) => {
		setName(event.target.value);
		setIsNameMissing(false);
	};

	return (
		<form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
			<AppDialogHeader title={t('settings.embeds.CREATE_TITLE')} onClose={onCancel} />
			<div className={cn(APP_DIALOG_BODY, 'flex flex-col gap-5 pt-1 pb-5')}>
				<div className="flex flex-col gap-1.5">
					<label className="text-xs font-medium text-foreground" htmlFor={nameId}>
						{t('settings.embeds.NAME_LABEL')}
					</label>
					<Input
						data-initial-focus=""
						id={nameId}
						autoComplete="off"
						spellCheck={false}
						maxLength={EMBED_CREDENTIAL_NAME_MAX_LENGTH}
						disabled={isCreating}
						aria-describedby={nameNoteId}
						aria-invalid={isNameMissing}
						value={name}
						onChange={changeName}
					/>
					<p className={noteClassName} id={nameNoteId}>
						{nameNote}
					</p>
				</div>
				{isClientFieldShown && (
					<CredentialClientField clientId={clientId} onChange={setClientId} disabled={isCreating} />
				)}
				{isAddMembersFieldShown && (
					<AddMembersField checked={canAddMembers} onChange={setCanAddMembers} disabled={isCreating} />
				)}
				{create.isError && <Notice tone="error" title={createFailureOf(create.error, t)} />}
			</div>
			<div className={cn(APP_DIALOG_FOOTER, 'justify-end')}>
				<Button type="button" variant="outline" onClick={onCancel} disabled={isCreating}>
					{t('common.CANCEL')}
				</Button>
				<Button type="submit" disabled={isCreating}>
					{isCreating && <Spinner className="animate-spin" aria-hidden="true" />}
					{submitLabel}
				</Button>
			</div>
		</form>
	);
}

/** The secret, shown this once, with where it belongs; Done (the only way out) forgets it. */
function CreatedCredentialStep({ created, onDone }: Readonly<{ created: CreatedEmbedCredential; onDone: () => void }>) {
	const t = useTranslations();
	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<AppDialogHeader title={t('settings.embeds.SECRET_TITLE')} />
			<div className={cn(APP_DIALOG_BODY, 'flex flex-col gap-4 pt-1 pb-5')}>
				<p className="text-[13px] text-pretty text-muted-foreground">
					{t('settings.embeds.SECRET_TEXT', { name: created.name })}
				</p>
				<ApiTokenSecret value={created.secret} />
				<Notice tone="neutral" title={t('settings.embeds.SECRET_SERVER_ONLY')} />
			</div>
			<div className={cn(APP_DIALOG_FOOTER, 'justify-end')}>
				<Button type="button" onClick={onDone} data-initial-focus="">
					{t('settings.embeds.DONE')}
				</Button>
			</div>
		</div>
	);
}

type CreateDialogProps = {
	open: boolean;
	/** The server can limit a credential to one client: an older one would drop the client and reach every client. */
	canLimitToClient: boolean;
	/** The server can let a credential add the people it signs in: an older one would drop the option. */
	canAllowAddMembers: boolean;
	onClose: () => void;
};

/**
 * Creates a credential from a name, a client when the server can limit it to one, and whether it adds the people it
 * signs in when the server can let it, then shows its secret this once. While the secret is on screen only Done
 * closes the dialog, and while the credential is being made nothing does: the secret the server answers would be
 * lost.
 */
export function CreateEmbedCredentialDialog({
	open,
	canLimitToClient,
	canAllowAddMembers,
	onClose
}: Readonly<CreateDialogProps>) {
	const create = useCreateEmbedCredential();
	const [created, setCreated] = useState<CreatedEmbedCredential | null>(null);
	const isSecretShown = created !== null;
	const isCreating = create.isPending;

	const close = () => {
		if (isCreating) {
			return;
		}
		setCreated(null);
		create.reset();
		onClose();
	};

	return (
		<AppDialog
			open={open}
			onClose={close}
			width="sm"
			keepOpenOnOutsideClick
			dismissible={!isSecretShown && !isCreating}
		>
			{created && <CreatedCredentialStep created={created} onDone={close} />}
			{!created && (
				<CreateCredentialForm
					create={create}
					canLimitToClient={canLimitToClient}
					canAllowAddMembers={canAllowAddMembers}
					onCancel={close}
					onCreated={setCreated}
				/>
			)}
		</AppDialog>
	);
}
