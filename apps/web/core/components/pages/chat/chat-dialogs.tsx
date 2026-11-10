'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/core/components/common/dialog';
import { Button } from '@/core/components/duplicated-components/_button';
import { Input } from '@/core/components/common/input';
import { Check, Search } from '@/core/components/icons';
import { PersonAvatar } from '@/core/components/teams/people-avatars';
import { cn } from '@/core/lib/helpers';
import { ChatPerson } from '@/core/lib/utils/chat-format';
import { CHAT_GROUP_MAX_MEMBERS, EChatVisibility, IChatConversationWithState } from '@/core/types/interfaces/common/chat';

/** The scrolling box a dialog lists its choices in, and one row of it: the list pane's rows, on a hairline. */
const LIST_BOX = 'max-h-60 overflow-y-auto rounded-xl p-1 hairline-ring ring-border';
const LIST_ROW = 'flex min-h-8 items-center gap-2.5 rounded-md px-2 text-[13px]';

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
			<div className="relative">
				<Search className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
				<Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('teamChat.SEARCH_PEOPLE')} aria-label={t('teamChat.SEARCH_PEOPLE')} className="ps-8" />
			</div>
			<ul className={LIST_BOX}>
				{shown.map((person) => {
					const isPicked = selected.has(person.employeeId);
					return (
						<li key={person.employeeId}>
							<button type="button" onClick={() => onToggle(person.employeeId)} className={cn(LIST_ROW, 'w-full cursor-pointer text-start outline-none transition-colors hover:bg-foreground/[0.04] focus-visible:bg-foreground/[0.06]', isPicked && 'bg-primary/[0.08] hover:bg-primary/[0.11]')} aria-pressed={isPicked}>
								<PersonAvatar person={{ id: person.employeeId, name: person.name, imageUrl: person.imageUrl }} className="size-5 text-[9px] ring-0" />
								<span className="min-w-0 flex-1 truncate">{person.name}</span>
								{isPicked && <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />}
							</button>
						</li>
					);
				})}
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
					<label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-foreground">
						<input type="checkbox" checked={isPrivate} onChange={(event) => setPrivate(event.target.checked)} className="size-3.5 accent-primary" />
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
				<ul className={cn(LIST_BOX, 'max-h-72')}>
					{isLoading && <li className="px-2 py-2 text-xs text-muted-foreground">{t('teamChat.LOADING')}</li>}
					{!isLoading && channels.length === 0 && <li className="px-2 py-2 text-xs text-muted-foreground">{t('teamChat.NO_CHANNELS_TO_JOIN')}</li>}
					{channels.map((channel) => (
						<li key={channel.id} className={cn(LIST_ROW, 'py-1.5')}>
							<span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-foreground/[0.05] text-base font-medium leading-none text-muted-foreground" aria-hidden="true">
								#
							</span>
							<span className="flex min-w-0 flex-1 flex-col">
								<span className="truncate font-medium text-foreground">{channel.name}</span>
								<span className="truncate text-xs text-muted-foreground">
									{t('teamChat.MEMBER_COUNT', { count: channel.memberCount })}
									{channel.topic && <span> · {channel.topic}</span>}
								</span>
							</span>
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
