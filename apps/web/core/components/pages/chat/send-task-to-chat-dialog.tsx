'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Check, Search, Task } from '@/core/components/icons';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/core/components/common/dialog';
import { Input } from '@/core/components/common/input';
import { Button } from '@/core/components/duplicated-components/_button';
import { useChatActions } from '@/core/hooks/chat/use-chat-actions';
import { useChatConversations } from '@/core/hooks/chat/use-chat-conversations';
import { useChatPeople, useChatScope } from '@/core/hooks/chat/use-chat-scope';
import { cn } from '@/core/lib/helpers';
import { conversationTitle, newNonce } from '@/core/lib/utils/chat-format';
import { sendableConversations, sendToChatBodyOf } from '@/core/lib/utils/chat-task';
import { CHAT_MESSAGE_MAX_LENGTH } from '@/core/types/interfaces/common/chat';
import { ConversationGlyph } from './conversation-glyph';

/**
 * The idempotency key of each task sent to each conversation, kept for the page's life and dropped once the platform
 * accepted the send: a send that failed (or whose answer was lost) and is tried again, even after the dialog was closed
 * and opened again, reuses its key, so the platform answers the message it already stored instead of posting it twice.
 */
const SEND_NONCES = new Map<string, string>();

/**
 * "Send to chat" on a task: pick one of my conversations, add a note if wanted, and the task arrives there as a card
 * under the note (the task's title when there is no note). Mounted while open, so the conversations are read only then.
 */
export function SendTaskToChatDialog({ task, onClose }: Readonly<{ task: { id: string; title: string }; onClose: () => void }>) {
	const t = useTranslations();
	const router = useRouter();
	const scope = useChatScope();
	const people = useChatPeople();
	const actions = useChatActions();
	const { conversations, isLoading, isError, retry } = useChatConversations(true);
	const [query, setQuery] = useState('');
	const [note, setNote] = useState('');
	const [targetId, setTargetId] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const unnamed = t('teamChat.UNNAMED');
	const titleOf = useMemo(
		() => (conversation: (typeof conversations)[number]) =>
			conversationTitle(conversation, people.byEmployee, scope?.employeeId ?? null, unnamed).replace(/^#/, ''),
		[people.byEmployee, scope?.employeeId, unnamed]
	);
	const shown = useMemo(() => sendableConversations(conversations, titleOf, query), [conversations, query, titleOf]);
	const target = conversations.find((conversation) => conversation.id === targetId) ?? null;
	const body = sendToChatBodyOf(note, task.title);

	const send = async () => {
		if (!target || !body || busy) return;
		setBusy(true);
		try {
			const key = `${task.id}:${target.id}`;
			const nonce = SEND_NONCES.get(key) ?? newNonce();
			SEND_NONCES.set(key, nonce);
			const message = await actions.send(target.id, { body, taskId: task.id, nonce });
			SEND_NONCES.delete(key);
			onClose();
			toast(t('teamChat.SENT_TO_CHAT', { name: titleOf(target) }), {
				action: { label: t('teamChat.OPEN'), onClick: () => router.push(`/chat/${encodeURIComponent(target.id)}?m=${encodeURIComponent(message.id)}`) }
			});
		} catch {
			toast.error(t('teamChat.SEND_FAILED'));
			setBusy(false);
		}
	};

	return (
		<Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
			<DialogContent>
				<form
					className="flex flex-col gap-4"
					onSubmit={(event) => {
						event.preventDefault();
						void send();
					}}
				>
					<DialogHeader>
						<DialogTitle>{t('teamChat.SEND_TO_CHAT_TITLE')}</DialogTitle>
						<DialogDescription>{t('teamChat.SEND_TO_CHAT_TEXT')}</DialogDescription>
					</DialogHeader>
					<div className="flex flex-col gap-2">
						<div className="relative">
							<Search className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
							<Input
								value={query}
								onChange={(event) => setQuery(event.target.value)}
								placeholder={t('teamChat.SEARCH_CONVERSATIONS')}
								aria-label={t('teamChat.SEARCH_CONVERSATIONS')}
								className="ps-8"
								autoFocus
							/>
						</div>
						<ul className="max-h-60 overflow-y-auto rounded-xl p-1 hairline-ring ring-border" aria-label={t('teamChat.CONVERSATIONS')}>
							{isLoading && <li className="px-2 py-2 text-xs text-muted-foreground">{t('teamChat.LOADING')}</li>}
							{isError && (
								<li className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
									{t('teamChat.LOAD_ERROR')}
									<Button type="button" variant="ghost" size="sm" onClick={() => void retry()}>
										{t('teamChat.RETRY')}
									</Button>
								</li>
							)}
							{shown.map((conversation) => {
								const isPicked = conversation.id === targetId;
								return (
									<li key={conversation.id}>
										<button
											type="button"
											onClick={() => setTargetId(conversation.id)}
											aria-pressed={isPicked}
											className={cn(
												'flex h-8 w-full cursor-pointer items-center gap-2.5 rounded-md px-2 text-start text-[13px] outline-none transition-colors hover:bg-foreground/[0.04] focus-visible:bg-foreground/[0.06]',
												isPicked && 'bg-primary/[0.08] hover:bg-primary/[0.11]'
											)}
										>
											<ConversationGlyph conversation={conversation} people={people.byEmployee} meEmployeeId={scope?.employeeId ?? null} />
											<span className="min-w-0 flex-1 truncate">{titleOf(conversation)}</span>
											{isPicked && <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />}
										</button>
									</li>
								);
							})}
							{!isLoading && !isError && shown.length === 0 && <li className="px-2 py-2 text-xs text-muted-foreground">{t('teamChat.NO_CONVERSATIONS')}</li>}
						</ul>
					</div>
					<textarea
						value={note}
						onChange={(event) => setNote(event.target.value)}
						maxLength={CHAT_MESSAGE_MAX_LENGTH}
						rows={3}
						placeholder={t('teamChat.NOTE_PLACEHOLDER')}
						aria-label={t('teamChat.NOTE_PLACEHOLDER')}
						className="w-full resize-none rounded-xl bg-card px-3 py-2 text-[13px] leading-relaxed outline-none hairline-ring ring-border transition-shadow placeholder:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25"
					/>
					{/* The card as the conversation will show it, under the note. */}
					<div className="flex items-center gap-2.5 rounded-lg bg-card px-2.5 py-2 text-[13px] hairline-ring ring-border">
						<span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary" aria-hidden="true">
							<Task className="size-3.5" />
						</span>
						<span className="min-w-0 truncate font-medium text-foreground">{task.title}</span>
					</div>
					<DialogFooter>
						<Button type="button" variant="outline" onClick={onClose} disabled={busy}>
							{t('teamChat.CANCEL')}
						</Button>
						<Button type="submit" disabled={!target || !body || busy}>
							{t('teamChat.SEND')}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
