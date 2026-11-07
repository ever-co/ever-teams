'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/core/components/common/dialog';
import { Button } from '@/core/components/duplicated-components/_button';
import { Input } from '@/core/components/common/input';
import { PersonAvatar } from '@/core/components/teams/people-avatars';
import { cn } from '@/core/lib/helpers';
import { ChatPerson } from '@/core/lib/utils/chat-format';
import { CHAT_GROUP_MAX_MEMBERS, EChatVisibility, IChatConversationWithState } from '@/core/types/interfaces/common/chat';

/** A list of people to pick from, by name, with the chosen ones ticked. */
function PeoplePicker({ people, selected, onToggle, exclude }: Readonly<{ people: readonly ChatPerson[]; selected: ReadonlySet<string>; onToggle: (employeeId: string) => void; exclude?: string | null }>) {
	const t = useTranslations();
	const [query, setQuery] = useState('');
	const shown = useMemo(() => {
		const needle = query.trim().toLowerCase();
		return people.filter((person) => person.employeeId !== exclude && (!needle || person.name.toLowerCase().includes(needle)));
	}, [exclude, people, query]);
	return (
		<div className="flex flex-col gap-2">
			<Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('teamChat.SEARCH_PEOPLE')} aria-label={t('teamChat.SEARCH_PEOPLE')} />
			<ul className="max-h-60 overflow-y-auto rounded-md border border-border p-1">
				{shown.map((person) => (
					<li key={person.employeeId}>
						<button type="button" onClick={() => onToggle(person.employeeId)} className={cn('flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1 text-left text-[13px] hover:bg-foreground/[0.04]', selected.has(person.employeeId) && 'bg-primary/[0.08]')} aria-pressed={selected.has(person.employeeId)}>
							<PersonAvatar person={{ id: person.employeeId, name: person.name, imageUrl: person.imageUrl }} size="sm" className="size-5" />
							<span className="truncate">{person.name}</span>
						</button>
					</li>
				))}
				{shown.length === 0 && <li className="px-2 py-2 text-xs text-muted-foreground">{t('teamChat.NO_PEOPLE')}</li>}
			</ul>
		</div>
	);
}

/** "New message": pick one person (a direct conversation) or several (a group). */
export function NewDirectDialog({ open, onOpenChange, people, meEmployeeId, onCreate }: Readonly<{ open: boolean; onOpenChange: (open: boolean) => void; people: readonly ChatPerson[]; meEmployeeId: string | null; onCreate: (employeeIds: string[]) => Promise<void> }>) {
	const t = useTranslations();
	const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());
	const [busy, setBusy] = useState(false);
	const toggle = (id: string) =>
		setSelected((previous) => {
			const next = new Set(previous);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	const create = async () => {
		if (!selected.size) return;
		setBusy(true);
		try {
			await onCreate([...selected]);
			setSelected(new Set());
			onOpenChange(false);
		} finally {
			setBusy(false);
		}
	};
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t('teamChat.NEW_MESSAGE')}</DialogTitle>
					<DialogDescription>{t('teamChat.NEW_MESSAGE_TEXT', { max: CHAT_GROUP_MAX_MEMBERS })}</DialogDescription>
				</DialogHeader>
				<PeoplePicker people={people} selected={selected} onToggle={toggle} exclude={meEmployeeId} />
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						{t('teamChat.CANCEL')}
					</Button>
					<Button onClick={() => void create()} disabled={busy || selected.size === 0 || selected.size >= CHAT_GROUP_MAX_MEMBERS}>
						{t('teamChat.START')}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

/** "New channel": a name, a topic, public or private, and the first members. */
export function NewChannelDialog({ open, onOpenChange, people, meEmployeeId, onCreate }: Readonly<{ open: boolean; onOpenChange: (open: boolean) => void; people: readonly ChatPerson[]; meEmployeeId: string | null; onCreate: (input: { name: string; topic: string; visibility: EChatVisibility; memberEmployeeIds: string[] }) => Promise<void> }>) {
	const t = useTranslations();
	const [name, setName] = useState('');
	const [topic, setTopic] = useState('');
	const [isPrivate, setPrivate] = useState(false);
	const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());
	const [busy, setBusy] = useState(false);
	const toggle = (id: string) =>
		setSelected((previous) => {
			const next = new Set(previous);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	const create = async () => {
		if (!name.trim()) return;
		setBusy(true);
		try {
			await onCreate({ name: name.trim(), topic: topic.trim(), visibility: isPrivate ? EChatVisibility.Private : EChatVisibility.Public, memberEmployeeIds: [...selected] });
			setName('');
			setTopic('');
			setSelected(new Set());
			onOpenChange(false);
		} finally {
			setBusy(false);
		}
	};
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t('teamChat.NEW_CHANNEL')}</DialogTitle>
					<DialogDescription>{t('teamChat.NEW_CHANNEL_TEXT')}</DialogDescription>
				</DialogHeader>
				<div className="flex flex-col gap-3">
					<Input value={name} onChange={(event) => setName(event.target.value)} placeholder={t('teamChat.CHANNEL_NAME')} aria-label={t('teamChat.CHANNEL_NAME')} maxLength={120} autoFocus />
					<Input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder={t('teamChat.CHANNEL_TOPIC')} aria-label={t('teamChat.CHANNEL_TOPIC')} maxLength={500} />
					<label className="inline-flex cursor-pointer items-center gap-2 text-sm">
						<input type="checkbox" checked={isPrivate} onChange={(event) => setPrivate(event.target.checked)} />
						{t('teamChat.PRIVATE_CHANNEL')}
					</label>
					<PeoplePicker people={people} selected={selected} onToggle={toggle} exclude={meEmployeeId} />
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						{t('teamChat.CANCEL')}
					</Button>
					<Button onClick={() => void create()} disabled={busy || !name.trim()}>
						{t('teamChat.CREATE')}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

/** "Browse channels": the public channels the caller is not in, with a join action. */
export function BrowseChannelsDialog({ open, onOpenChange, channels, isLoading, onJoin }: Readonly<{ open: boolean; onOpenChange: (open: boolean) => void; channels: readonly IChatConversationWithState[]; isLoading: boolean; onJoin: (id: string) => Promise<void> }>) {
	const t = useTranslations();
	const [joining, setJoining] = useState<string | null>(null);
	const join = async (id: string) => {
		setJoining(id);
		try {
			await onJoin(id);
			onOpenChange(false);
		} finally {
			setJoining(null);
		}
	};
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t('teamChat.BROWSE_CHANNELS')}</DialogTitle>
					<DialogDescription>{t('teamChat.BROWSE_TEXT')}</DialogDescription>
				</DialogHeader>
				<ul className="max-h-72 overflow-y-auto rounded-md border border-border p-1">
					{isLoading && <li className="px-2 py-2 text-xs text-muted-foreground">{t('teamChat.LOADING')}</li>}
					{!isLoading && channels.length === 0 && <li className="px-2 py-2 text-xs text-muted-foreground">{t('teamChat.NO_CHANNELS_TO_JOIN')}</li>}
					{channels.map((channel) => (
						<li key={channel.id} className="flex items-center gap-2 rounded-sm px-2 py-1 text-[13px]">
							<span className="min-w-0 flex-1 truncate">
								<span className="font-medium text-foreground">#{channel.name}</span>
								{channel.topic && <span className="ml-2 text-muted-foreground">{channel.topic}</span>}
							</span>
							<span className="text-[11px] text-muted-foreground">{t('teamChat.MEMBER_COUNT', { count: channel.memberCount })}</span>
							<Button size="sm" variant="outline" onClick={() => void join(channel.id)} disabled={joining === channel.id}>
								{t('teamChat.JOIN')}
							</Button>
						</li>
					))}
				</ul>
			</DialogContent>
		</Dialog>
	);
}
