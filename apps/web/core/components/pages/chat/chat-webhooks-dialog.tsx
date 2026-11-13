'use client';

import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from '@/core/components/common/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/core/components/common/dialog';
import { Input } from '@/core/components/common/input';
import { Button, buttonVariants } from '@/core/components/duplicated-components/_button';
import { Bot, Check, CircleX, Copy, Key, Pencil, Plus } from '@/core/components/icons';
import {
	useChatWebhookWrites,
	type ChatWebhooksList,
	type TChatWebhookWrite
} from '@/core/hooks/chat/use-chat-webhooks';
import { httpsUrlOf } from '@/core/lib/utils/chat-app-blocks';
import type { ChatPerson } from '@/core/lib/utils/chat-format';
import {
	EMPTY_WEBHOOK_FORM,
	isWebhookLimitReached,
	webhookChanges,
	webhookCreateInputOf,
	webhookFailureOf,
	webhookFormOf,
	type ChatWebhookForm,
	type TChatWebhookFailure
} from '@/core/lib/utils/chat-webhooks';
import { cn } from '@/core/lib/helpers';
import {
	CHAT_WEBHOOK_MAX_PER_CONVERSATION,
	CHAT_WEBHOOK_NAME_MAX_LENGTH,
	CHAT_WEBHOOK_URL_MAX_LENGTH,
	type IChatWebhook
} from '@/core/types/interfaces/common/chat';

/** What a write made that shows this once: the URL senders post to, the key the callbacks are signed with. */
interface ShownSecrets {
	name: string;
	url?: string;
	signingSecret?: string;
}

/** Why the last action failed: a write's refusal (with the platform's own explanation of a refused value) or a copy. */
type PanelFailure = { reason: TChatWebhookFailure | 'COPY_FAILED'; detail: string | null };

/** The message of each failure (static keys, so the translation checks find them). */
const FAILURE_KEYS = {
	FORBIDDEN: 'teamChat.WEBHOOKS.FORBIDDEN',
	FULL: 'teamChat.WEBHOOKS.FULL',
	INVALID: 'teamChat.WEBHOOKS.INVALID',
	GONE: 'teamChat.WEBHOOKS.GONE',
	FAILED: 'teamChat.UPDATE_FAILED',
	COPY_FAILED: 'teamChat.WEBHOOKS.COPY_FAILED'
} as const satisfies Record<PanelFailure['reason'], string>;

/** How long "Copied" shows on a copy button. */
const COPIED_MS = 2000;

const ICON_BUTTON =
	'inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-foreground/[0.06] hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-default disabled:opacity-50 [@media(pointer:coarse)]:size-9 [&_svg]:size-4';

/** A webhook's icon (https only, as the platform stores it), or the app mark when it has none or it fails to load. */
function WebhookIcon({ url }: Readonly<{ url: string | null | undefined }>) {
	const icon = httpsUrlOf(url);
	const [failed, setFailed] = useState<string | null>(null);
	if (icon && failed !== icon) {
		return (
			<img
				src={icon}
				alt=""
				referrerPolicy="no-referrer"
				loading="lazy"
				className="size-8 shrink-0 rounded-md object-cover"
				data-webhook-icon=""
				onError={() => setFailed(icon)}
			/>
		);
	}
	return (
		<span
			className="flex size-8 shrink-0 items-center justify-center rounded-md bg-foreground/[0.06] text-muted-foreground"
			aria-hidden="true"
		>
			<Bot className="size-4" />
		</span>
	);
}

/** The fields of a webhook, new or edited. */
function WebhookFields({
	form,
	onChange,
	idBase
}: Readonly<{ form: ChatWebhookForm; onChange: (change: Partial<ChatWebhookForm>) => void; idBase: string }>) {
	const t = useTranslations();
	return (
		<div className="flex flex-col gap-2.5">
			<label className="flex flex-col gap-1 text-xs font-medium text-foreground" htmlFor={`${idBase}-name`}>
				{t('teamChat.WEBHOOKS.NAME')}
				<Input
					id={`${idBase}-name`}
					value={form.name}
					onChange={(event) => onChange({ name: event.target.value })}
					maxLength={CHAT_WEBHOOK_NAME_MAX_LENGTH}
					required
					autoFocus
				/>
			</label>
			<label className="flex flex-col gap-1 text-xs font-medium text-foreground" htmlFor={`${idBase}-icon`}>
				{t('teamChat.WEBHOOKS.ICON_URL')}
				<Input
					id={`${idBase}-icon`}
					type="url"
					inputMode="url"
					placeholder="https://"
					value={form.iconUrl}
					onChange={(event) => onChange({ iconUrl: event.target.value })}
					maxLength={CHAT_WEBHOOK_URL_MAX_LENGTH}
				/>
			</label>
			<label
				className="flex flex-col gap-1 text-xs font-medium text-foreground"
				htmlFor={`${idBase}-interaction`}
			>
				{t('teamChat.WEBHOOKS.INTERACTION_URL')}
				<Input
					id={`${idBase}-interaction`}
					type="url"
					inputMode="url"
					placeholder="https://"
					value={form.interactionUrl}
					onChange={(event) => onChange({ interactionUrl: event.target.value })}
					maxLength={CHAT_WEBHOOK_URL_MAX_LENGTH}
				/>
				<span className="font-normal text-muted-foreground">{t('teamChat.WEBHOOKS.INTERACTION_HINT')}</span>
			</label>
			<label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-foreground">
				<input
					type="checkbox"
					checked={form.canBroadcast}
					onChange={(event) => onChange({ canBroadcast: event.target.checked })}
					className="size-3.5 accent-primary"
				/>
				{t('teamChat.WEBHOOKS.BROADCAST')}
			</label>
		</div>
	);
}

/** One secret on screen, read-only, with its copy button. */
function SecretField({
	id,
	label,
	copyLabel,
	value,
	isCopied,
	onCopy
}: Readonly<{ id: string; label: string; copyLabel: string; value: string; isCopied: boolean; onCopy: () => void }>) {
	const t = useTranslations();
	return (
		<div className="flex flex-col gap-1">
			<label htmlFor={id} className="text-xs font-medium text-foreground">
				{label}
			</label>
			<div className="flex items-center gap-2">
				<Input
					id={id}
					readOnly
					value={value}
					onFocus={(event) => event.currentTarget.select()}
					className="font-mono text-xs md:text-xs"
					spellCheck={false}
				/>
				<Button type="button" variant="outline" size="sm" onClick={onCopy} aria-label={copyLabel}>
					{isCopied ? (
						<Check className="size-3.5" aria-hidden="true" />
					) : (
						<Copy className="size-3.5" aria-hidden="true" />
					)}
					{isCopied ? t('teamChat.WEBHOOKS.COPIED') : t('teamChat.WEBHOOKS.COPY')}
				</Button>
			</div>
		</div>
	);
}

/**
 * "Are you sure?" before a write that cannot be taken back: a new signing secret (the old one stops working) or a
 * revoke. Built on the alert dialog itself, not the app's confirmation (which loads the whole components barrel).
 */
function ConfirmWrite({
	open,
	title,
	description,
	confirmText,
	onConfirm,
	onCancel
}: Readonly<{
	open: boolean;
	title: string;
	description: string;
	confirmText: string;
	onConfirm: () => void;
	onCancel: () => void;
}>) {
	const t = useTranslations();
	return (
		<AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel onClick={onCancel} autoFocus>
						{t('teamChat.CANCEL')}
					</AlertDialogCancel>
					<AlertDialogAction className={buttonVariants({ variant: 'destructive' })} onClick={onConfirm}>
						{confirmText}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

interface PanelProps {
	conversationId: string;
	webhooks: ChatWebhooksList;
	people: ReadonlyMap<string, ChatPerson>;
	/** Whether the dialog may not close: a write is under way, or a URL or secret is on screen until it is dismissed. */
	onLockChange: (locked: boolean) => void;
}

/**
 * The Integrations dialog's body: the channel's webhooks (name, icon, who made it and when, when it was last used, its
 * counters, revoked), a new one (its URL and signing secret shown once, with copy buttons), and for each one its
 * name, icon, interaction URL and broadcast right, a new signing secret and revoke — both confirmed first.
 */
function ChatWebhooksPanel({ conversationId, webhooks, people, onLockChange }: Readonly<PanelProps>) {
	const t = useTranslations();
	const locale = useLocale();
	const writes = useChatWebhookWrites(conversationId);
	const [busy, setBusy] = useState(false);
	const [creating, setCreating] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [form, setForm] = useState<ChatWebhookForm>(EMPTY_WEBHOOK_FORM);
	const [secrets, setSecrets] = useState<ShownSecrets | null>(null);
	const [copied, setCopied] = useState<'url' | 'secret' | null>(null);
	const [failure, setFailure] = useState<PanelFailure | null>(null);
	const [confirming, setConfirming] = useState<{ kind: 'rotate' | 'revoke'; webhook: IChatWebhook } | null>(null);
	const copiedTimer = useRef<number | null>(null);
	const { refresh } = webhooks;
	const list = webhooks.webhooks;
	const isFull = isWebhookLimitReached(list);
	const locked = busy || secrets !== null;

	// Each opening reads the list again: the counters and "last used" move with every post.
	useEffect(() => {
		refresh();
	}, [refresh]);

	useEffect(() => {
		onLockChange(locked);
	}, [locked, onLockChange]);

	useEffect(
		() => () => {
			onLockChange(false);
			if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current);
		},
		[onLockChange]
	);

	const dateOf = useCallback(
		(value: string | null | undefined, withTime: boolean) => {
			if (!value) return '';
			const date = new Date(value);
			if (Number.isNaN(date.getTime())) return '';
			return new Intl.DateTimeFormat(
				locale,
				withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' }
			).format(date);
		},
		[locale]
	);

	const patchForm = (change: Partial<ChatWebhookForm>) => setForm((previous) => ({ ...previous, ...change }));

	/** Runs a write; whatever URL or secret it made shows (this once). A refusal shows why. */
	const run = async (write: TChatWebhookWrite, done?: () => void) => {
		setBusy(true);
		setFailure(null);
		try {
			const result = await writes.write(write);
			done?.();
			if (result.url || result.signingSecret) {
				setCopied(null);
				setSecrets({ name: result.webhook.name, url: result.url, signingSecret: result.signingSecret });
			}
		} catch (error) {
			const { reason, detail } = webhookFailureOf(error, write.kind);
			setFailure({ reason, detail });
			// The webhook or the channel is gone, or webhooks were turned off: the list says which.
			if (reason === 'GONE') refresh();
		} finally {
			setBusy(false);
		}
	};

	const startCreate = () => {
		setForm(EMPTY_WEBHOOK_FORM);
		setEditingId(null);
		setCreating(true);
		setFailure(null);
	};

	const startEdit = (webhook: IChatWebhook) => {
		setCreating(false);
		setForm(webhookFormOf(webhook));
		setEditingId(webhook.id);
		setFailure(null);
	};

	const create = (event: FormEvent) => {
		event.preventDefault();
		// A URL or secret on screen is shown once: no write that may make another until it is dismissed.
		if (!form.name.trim() || busy || secrets) return;
		void run({ kind: 'create', input: webhookCreateInputOf(form) }, () => {
			setCreating(false);
			setForm(EMPTY_WEBHOOK_FORM);
		});
	};

	const saveEdit = (event: FormEvent, webhook: IChatWebhook) => {
		event.preventDefault();
		if (busy || secrets) return;
		const changes = webhookChanges(webhook, form);
		if (!Object.keys(changes).length) {
			setEditingId(null);
			return;
		}
		void run({ kind: 'update', webhookId: webhook.id, changes }, () => setEditingId(null));
	};

	const confirm = () => {
		const chosen = confirming;
		setConfirming(null);
		if (!chosen) return;
		void run({ kind: chosen.kind, webhookId: chosen.webhook.id });
	};

	const copy = (value: string, which: 'url' | 'secret') => {
		const clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
		if (!clipboard?.writeText) {
			setFailure({ reason: 'COPY_FAILED', detail: null });
			return;
		}
		clipboard.writeText(value).then(
			() => {
				setCopied(which);
				if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current);
				copiedTimer.current = window.setTimeout(
					() => setCopied((current) => (current === which ? null : current)),
					COPIED_MS
				);
			},
			() => setFailure({ reason: 'COPY_FAILED', detail: null })
		);
	};

	const creatorOf = (webhook: IChatWebhook) => {
		const person = webhook.createdByEmployeeId ? people.get(String(webhook.createdByEmployeeId)) : undefined;
		return person?.name ?? t('teamChat.SOMEONE');
	};

	// Webhooks turned off on the platform (404), or I no longer manage the channel (403), while the dialog is open.
	const isUnavailable = webhooks.availability === 'off' || webhooks.availability === 'forbidden';

	return (
		<div className="flex min-w-0 flex-col gap-3">
			{secrets && (
				<div
					className="flex flex-col gap-2.5 rounded-xl bg-amber-500/[0.08] p-3 hairline-ring ring-amber-500/30"
					role="status"
					data-webhook-secrets=""
				>
					<p className="text-[13px] font-medium text-foreground">
						{t('teamChat.WEBHOOKS.SHOWN_ONCE', { name: secrets.name })}
					</p>
					{secrets.url && (
						<SecretField
							id={`webhook-url-${conversationId}`}
							label={t('teamChat.WEBHOOKS.URL')}
							copyLabel={t('teamChat.WEBHOOKS.COPY_URL')}
							value={secrets.url}
							isCopied={copied === 'url'}
							onCopy={() => copy(secrets.url as string, 'url')}
						/>
					)}
					{secrets.signingSecret && (
						<SecretField
							id={`webhook-secret-${conversationId}`}
							label={t('teamChat.WEBHOOKS.SIGNING_SECRET')}
							copyLabel={t('teamChat.WEBHOOKS.COPY_SECRET')}
							value={secrets.signingSecret}
							isCopied={copied === 'secret'}
							onCopy={() => copy(secrets.signingSecret as string, 'secret')}
						/>
					)}
					<div className="flex justify-end">
						<Button type="button" size="sm" onClick={() => setSecrets(null)} autoFocus>
							{t('teamChat.WEBHOOKS.DONE')}
						</Button>
					</div>
				</div>
			)}

			{isUnavailable && (
				<p className="text-[13px] text-muted-foreground" data-webhooks-unavailable="">
					{webhooks.availability === 'forbidden'
						? t('teamChat.WEBHOOKS.FORBIDDEN')
						: t('teamChat.WEBHOOKS.OFF')}
				</p>
			)}

			{!isUnavailable && webhooks.availability === 'failed' && (
				<div
					className="flex items-center justify-between gap-2 text-[13px] text-destructive"
					role="alert"
					data-webhooks-load-failed=""
				>
					<span>{t('teamChat.WEBHOOKS.LOAD_FAILED')}</span>
					<Button type="button" variant="outline" size="sm" onClick={refresh}>
						{t('teamChat.RETRY')}
					</Button>
				</div>
			)}

			{webhooks.isLoading && <p className="text-xs text-muted-foreground">{t('teamChat.LOADING')}</p>}

			{!isUnavailable && webhooks.isListed && (
				<ul
					className="flex max-h-[45vh] flex-col overflow-y-auto rounded-xl bg-card px-2.5 hairline-ring ring-border hairline-divide-y divide-border"
					aria-label={t('teamChat.WEBHOOKS.TITLE')}
				>
					{list.map((webhook) => {
						const isRevoked = !!webhook.revokedAt;
						const lastUsed = dateOf(webhook.lastUsedAt, true);
						return (
							<li key={webhook.id} className="flex flex-col gap-2 py-2.5" data-webhook-id={webhook.id}>
								<div className={cn('flex items-start gap-2.5', isRevoked && 'opacity-60')}>
									<WebhookIcon url={webhook.iconUrl} />
									<div className="flex min-w-0 flex-1 flex-col gap-0.5">
										<p className="truncate text-[13px] font-medium text-foreground">
											{webhook.name}
										</p>
										<p className="text-xs text-muted-foreground">
											{t('teamChat.WEBHOOKS.CREATED_BY', {
												name: creatorOf(webhook),
												date: dateOf(webhook.createdAt, false)
											})}
											{' · '}…{webhook.tokenHint}
											{' · '}
											{lastUsed
												? t('teamChat.WEBHOOKS.LAST_USED', { date: lastUsed })
												: t('teamChat.WEBHOOKS.NEVER_USED')}
										</p>
										<p
											className="text-xs tabular-nums text-muted-foreground"
											data-webhook-counts=""
										>
											{t('teamChat.WEBHOOKS.COUNTS', {
												accepted: webhook.acceptedCount ?? 0,
												rejected: webhook.rejectedCount ?? 0,
												limited: webhook.rateLimitedCount ?? 0,
												failures: webhook.callbackFailureCount ?? 0
											})}
										</p>
									</div>
									{isRevoked ? (
										<span className="shrink-0 rounded-full bg-foreground/[0.06] px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
											{t('teamChat.WEBHOOKS.REVOKED')}
										</span>
									) : (
										<div className="flex shrink-0 items-center gap-0.5">
											<button
												type="button"
												className={ICON_BUTTON}
												disabled={busy || !!secrets}
												onClick={() => startEdit(webhook)}
												aria-label={t('teamChat.WEBHOOKS.EDIT_NAMED', { name: webhook.name })}
												title={t('teamChat.WEBHOOKS.EDIT')}
											>
												<Pencil />
											</button>
											<button
												type="button"
												className={ICON_BUTTON}
												disabled={busy || !!secrets}
												onClick={() => setConfirming({ kind: 'rotate', webhook })}
												aria-label={t('teamChat.WEBHOOKS.ROTATE_NAMED', { name: webhook.name })}
												title={t('teamChat.WEBHOOKS.ROTATE')}
											>
												<Key />
											</button>
											<button
												type="button"
												className={cn(ICON_BUTTON, 'hover:text-destructive')}
												disabled={busy}
												onClick={() => setConfirming({ kind: 'revoke', webhook })}
												aria-label={t('teamChat.WEBHOOKS.REVOKE_NAMED', { name: webhook.name })}
												title={t('teamChat.WEBHOOKS.REVOKE')}
											>
												<CircleX />
											</button>
										</div>
									)}
								</div>
								{editingId === webhook.id && !isRevoked && (
									<form
										className="flex flex-col gap-3 ps-[2.625rem]"
										onSubmit={(event) => saveEdit(event, webhook)}
										aria-label={t('teamChat.WEBHOOKS.EDIT_NAMED', { name: webhook.name })}
									>
										<WebhookFields
											form={form}
											onChange={patchForm}
											idBase={`webhook-edit-${webhook.id}`}
										/>
										<div className="flex justify-end gap-2">
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() => setEditingId(null)}
											>
												{t('teamChat.CANCEL')}
											</Button>
											<Button
												type="submit"
												size="sm"
												disabled={busy || !!secrets || !form.name.trim()}
											>
												{t('teamChat.SAVE')}
											</Button>
										</div>
									</form>
								)}
							</li>
						);
					})}
					{list.length === 0 && (
						<li className="py-3 text-xs text-muted-foreground">{t('teamChat.WEBHOOKS.EMPTY')}</li>
					)}
				</ul>
			)}

			{!isUnavailable && webhooks.isListed && creating && (
				<form
					className="flex flex-col gap-3 rounded-xl p-3 hairline-ring ring-border"
					onSubmit={create}
					aria-label={t('teamChat.WEBHOOKS.NEW')}
				>
					<WebhookFields form={form} onChange={patchForm} idBase={`webhook-new-${conversationId}`} />
					<div className="flex justify-end gap-2">
						<Button type="button" variant="outline" size="sm" onClick={() => setCreating(false)}>
							{t('teamChat.CANCEL')}
						</Button>
						<Button type="submit" size="sm" disabled={busy || !!secrets || !form.name.trim()}>
							{t('teamChat.WEBHOOKS.CREATE')}
						</Button>
					</div>
				</form>
			)}

			{!isUnavailable && webhooks.isListed && !creating && !editingId && (
				<div className="flex flex-col items-start gap-1.5">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={startCreate}
						disabled={busy || isFull || !!secrets}
					>
						<Plus className="size-3.5" aria-hidden="true" />
						{t('teamChat.WEBHOOKS.NEW')}
					</Button>
					{isFull && (
						<p className="text-xs text-muted-foreground">
							{t('teamChat.WEBHOOKS.FULL', { max: CHAT_WEBHOOK_MAX_PER_CONVERSATION })}
						</p>
					)}
				</div>
			)}

			{failure && (
				<div
					className="flex flex-col gap-0.5 text-[13px] text-destructive"
					role="alert"
					data-webhooks-error={failure.reason}
				>
					<p>
						{failure.reason === 'FULL'
							? t(FAILURE_KEYS.FULL, { max: CHAT_WEBHOOK_MAX_PER_CONVERSATION })
							: t(FAILURE_KEYS[failure.reason])}
					</p>
					{failure.detail && <p className="text-xs text-destructive/80">{failure.detail}</p>}
				</div>
			)}

			<ConfirmWrite
				open={confirming !== null}
				title={t(
					confirming?.kind === 'revoke' ? 'teamChat.WEBHOOKS.REVOKE_NAMED' : 'teamChat.WEBHOOKS.ROTATE_NAMED',
					{ name: confirming?.webhook.name ?? '' }
				)}
				description={t(
					confirming?.kind === 'revoke'
						? 'teamChat.WEBHOOKS.REVOKE_CONFIRM'
						: 'teamChat.WEBHOOKS.ROTATE_CONFIRM',
					{ name: confirming?.webhook.name ?? '' }
				)}
				confirmText={t(confirming?.kind === 'revoke' ? 'teamChat.WEBHOOKS.REVOKE' : 'teamChat.WEBHOOKS.ROTATE')}
				onCancel={() => setConfirming(null)}
				onConfirm={confirm}
			/>
		</div>
	);
}

interface ChatWebhooksDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	conversationId: string;
	/** The channel's name, without its `#`. */
	channelName: string;
	webhooks: ChatWebhooksList;
	people: ReadonlyMap<string, ChatPerson>;
}

/**
 * A channel's Integrations (its incoming webhooks), for its managers, behind `NEXT_PUBLIC_CHAT_WEBHOOKS_ENABLED`.
 * It stays open while a write is under way (a create that finished after a close would show its URL to nobody) and
 * while a URL or signing secret is on screen, until "I have copied them": closed, they cannot be shown again.
 */
export function ChatWebhooksDialog({
	open,
	onOpenChange,
	conversationId,
	channelName,
	webhooks,
	people
}: Readonly<ChatWebhooksDialogProps>) {
	const t = useTranslations();
	const [locked, setLocked] = useState(false);
	const changeOpen = (next: boolean) => {
		if (!next && locked) return;
		onOpenChange(next);
	};
	return (
		<Dialog open={open} onOpenChange={changeOpen}>
			<DialogContent className="max-w-xl" showCloseButton={!locked}>
				<DialogHeader>
					<DialogTitle>{t('teamChat.WEBHOOKS.DIALOG_TITLE', { name: channelName })}</DialogTitle>
					<DialogDescription>{t('teamChat.WEBHOOKS.INTRO')}</DialogDescription>
				</DialogHeader>
				<ChatWebhooksPanel
					conversationId={conversationId}
					webhooks={webhooks}
					people={people}
					onLockChange={setLocked}
				/>
			</DialogContent>
		</Dialog>
	);
}
