'use client';

import { type ReactNode, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Lock, Users } from '@/core/components/icons';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/core/components/common/dialog';
import { Input } from '@/core/components/common/input';
import { Button } from '@/core/components/duplicated-components/_button';
import { useChatActions } from '@/core/hooks/chat/use-chat-actions';
import { useChatConversations } from '@/core/hooks/chat/use-chat-conversations';
import { useChatPeople, useChatScope } from '@/core/hooks/chat/use-chat-scope';
import { cn } from '@/core/lib/helpers';
import { conversationTitle, newNonce } from '@/core/lib/utils/chat-format';
import { sendableConversations, sendToChatBodyOf } from '@/core/lib/utils/chat-task';
import { CHAT_MESSAGE_MAX_LENGTH, EChatConversationKind, EChatVisibility } from '@/core/types/interfaces/common/chat';

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
	// One idempotency key for this dialog: pressing Send again after a failure (the dialog stays open as the retry)
	// never posts the message twice, even when the first attempt reached the platform. A new target gets a new key.
	const [nonces] = useState(() => new Map<string, string>());
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
			if (!nonces.has(target.id)) nonces.set(target.id, newNonce());
			const message = await actions.send(target.id, { body, taskId: task.id, nonce: nonces.get(target.id) });
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
						<Input
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							placeholder={t('teamChat.SEARCH_CONVERSATIONS')}
							aria-label={t('teamChat.SEARCH_CONVERSATIONS')}
							autoFocus
						/>
						<ul className="max-h-60 overflow-y-auto rounded-md border border-border p-1" aria-label={t('teamChat.CONVERSATIONS')}>
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
								const isChannel = conversation.kind === EChatConversationKind.Channel;
								let marker: ReactNode = <Users className="size-3.5" />;
								if (isChannel) marker = conversation.visibility === EChatVisibility.Private ? <Lock className="size-3.5" /> : '#';
								return (
									<li key={conversation.id}>
										<button
											type="button"
											onClick={() => setTargetId(conversation.id)}
											aria-pressed={conversation.id === targetId}
											className={cn(
												'flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1 text-left text-[13px] hover:bg-foreground/[0.04]',
												conversation.id === targetId && 'bg-primary/[0.08]'
											)}
										>
											<span className="flex w-4 shrink-0 justify-center text-muted-foreground">{marker}</span>
											<span className="truncate">{titleOf(conversation)}</span>
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
						className="w-full resize-none rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25"
					/>
					<div className="truncate rounded-md border border-border px-3 py-2 text-[13px]">
						<span className="font-medium text-foreground">{task.title}</span>
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
