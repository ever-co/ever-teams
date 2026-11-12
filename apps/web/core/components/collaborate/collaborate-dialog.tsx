'use client';

import { type KeyboardEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';
import { nanoid } from 'nanoid';
import { toast } from 'sonner';
import { Check, Copy, Info, Link, Pencil, Search, VideoCall } from '@/core/components/icons';
import { Button } from '@/core/components/duplicated-components/_button';
import {
	AppDialog,
	APP_DIALOG_BODY,
	APP_DIALOG_FOOTER,
	AppDialogDescription,
	AppDialogHeader
} from '@/core/components/common/app-dialog';
import { EntityTile } from '@/core/components/common/entity-tile';
import { SegmentedControl, type SegmentedControlItem } from '@/core/components/common/segmented-control';
import { SelectedMark } from '@/core/components/common/selected-mark';
import { AvatarStack, PersonAvatar, type Person } from '@/core/components/teams/people-avatars';
import { getTimerStatusValue, TimerStatus } from '@/core/components/timer/timer-status';
import { preloadLiveKit } from '@/core/components/optimized-components/meet';
import { activeTeamState, timerStatusState } from '@/core/stores';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { BOARD_APP_DOMAIN } from '@/core/constants/config/constants';
import { cn } from '@/core/lib/helpers';
import {
	boardTargetFor,
	type CollaborationMode,
	isJitsiMeeting,
	meetPathFor,
	meetRoomNameFor
} from '@/core/lib/utils/collaboration';
import type { ETimerStatus } from '@/core/types/generics/enums/timer';
import type { TOrganizationTeamEmployee } from '@/core/types/schemas';

interface Collaborator extends Person {
	email: string;
	status: ETimerStatus;
}

type Translate = ReturnType<typeof useTranslations>;

const ROW_SELECTOR = '[data-collaborator-row]';

/** The white surface every block of the dialog sits on: one hairline, one resting shadow, no grey fill. */
const SECTION_SURFACE = 'rounded-xl bg-card hairline-ring ring-border shadow-sm shadow-black/6.5';

const SECTION_LABEL = 'text-xs font-medium text-muted-foreground';

const TEXT_ACTION =
	'h-6 shrink-0 cursor-pointer rounded-md px-1.5 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25';

function firstFilled(candidates: ReadonlyArray<string | null | undefined>): string {
	const found = candidates.find((candidate) => Boolean(candidate?.trim()));

	return found?.trim() ?? '';
}

function collaboratorOf(
	member: TOrganizationTeamEmployee,
	timerStatus: Parameters<typeof getTimerStatusValue>[0]
): Collaborator | null {
	const user = member.employee?.user;
	if (!user?.id) {
		return null;
	}
	const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');

	return {
		id: user.id,
		name: firstFilled([user.name, fullName, user.email]),
		email: user.email ?? '',
		imageUrl: firstFilled([user.image?.thumbUrl, user.image?.fullUrl, user.imageUrl]) || null,
		status: getTimerStatusValue(timerStatus, member, false)
	};
}

function matchesQuery(person: Collaborator, query: string): boolean {
	if (query.length === 0) {
		return true;
	}
	const inName = person.name.toLowerCase().includes(query);
	const inEmail = person.email.toLowerCase().includes(query);

	return inName || inEmail;
}

/** Up and down walk the list from the search field and between rows. */
function moveFocus(event: KeyboardEvent<HTMLElement>, container: HTMLElement | null) {
	const isDown = event.key === 'ArrowDown';
	const isUp = event.key === 'ArrowUp';
	if (!isDown && !isUp) {
		return;
	}
	const rows = Array.from(container?.querySelectorAll<HTMLButtonElement>(ROW_SELECTOR) ?? []);
	if (rows.length === 0) {
		return;
	}
	event.preventDefault();
	const current = rows.indexOf(document.activeElement as HTMLButtonElement);
	const step = stepOf(isDown);
	const lastIndex = rows.length - 1;
	const wanted = current + step;
	const notBeforeFirst = Math.max(0, wanted);
	const next = Math.min(lastIndex, notBeforeFirst);
	rows[next]?.focus();
}

function stepOf(isDown: boolean): number {
	if (isDown) {
		return 1;
	}

	return -1;
}

function meOf(user: { id: string; name?: string | null; imageUrl?: string | null } | null | undefined): Person[] {
	if (!user) {
		return [];
	}

	return [{ id: user.id, name: user.name ?? '', imageUrl: user.imageUrl }];
}

/** True when the link reached the clipboard; a refused permission or a missing API is not an error here. */
async function copyQuietly(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		return false;
	}
}

function originOf(): string {
	if (typeof window === 'undefined') {
		return '';
	}

	return window.location.origin;
}

/** The link as people read it: no protocol in front. */
function readableLinkOf(link: string): string {
	return link.replace(/^https?:\/\//, '');
}

function primaryLabelOf(mode: CollaborationMode, t: Translate): string {
	if (mode === 'meeting') {
		return t('collaborate.START_MEETING');
	}

	return t('collaborate.OPEN_BOARD');
}

function boardNoteOf(hasBoardApp: boolean, t: Translate): string {
	if (hasBoardApp) {
		return t('collaborate.BOARD_LIVE');
	}

	return t('collaborate.BOARD_PRIVATE');
}

function TeamContext() {
	const activeTeam = useAtomValue(activeTeamState);
	if (!activeTeam?.name) {
		return null;
	}

	return (
		<>
			<EntityTile
				name={activeTeam.name}
				color={activeTeam.color}
				imageUrl={activeTeam.image?.thumbUrl ?? activeTeam.image?.fullUrl}
				className="size-4 text-[7px]"
			/>
			<span className="truncate">{activeTeam.name}</span>
		</>
	);
}

function CollaboratorRow({
	person,
	isPicked,
	onToggle,
	onKeyDown
}: Readonly<{
	person: Collaborator;
	isPicked: boolean;
	onToggle: (id: string) => void;
	onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}>) {
	return (
		<li>
			<button
				type="button"
				role="checkbox"
				aria-checked={isPicked}
				data-collaborator-row=""
				onClick={() => onToggle(person.id)}
				onKeyDown={onKeyDown}
				className="flex h-12 w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 text-left outline-none transition-colors hover:bg-foreground/5 focus-visible:bg-foreground/5 focus-visible:ring-[3px] focus-visible:ring-ring/25"
			>
				<span className="relative shrink-0">
					<PersonAvatar person={person} size="md" className="ring-0" />
					<TimerStatus
						status={person.status}
						size="sm"
						className="ring-2 ring-popover"
						tooltipClassName="absolute -right-1 -bottom-1"
					/>
				</span>
				<span className="flex min-w-0 flex-1 flex-col gap-0.5">
					<span className="truncate text-[13px] font-medium leading-tight text-foreground">
						{person.name}
					</span>
					{person.email && (
						<span className="truncate text-xs leading-tight text-muted-foreground">{person.email}</span>
					)}
				</span>
				<span className="flex size-5 shrink-0 items-center justify-center">{isPicked && <SelectedMark />}</span>
			</button>
		</li>
	);
}

function SelectionToggle({
	hasPicked,
	onSelectAll,
	onClear
}: Readonly<{ hasPicked: boolean; onSelectAll: () => void; onClear: () => void }>) {
	const t = useTranslations();
	if (hasPicked) {
		return (
			<button type="button" onClick={onClear} className={TEXT_ACTION}>
				{t('common.CLEAR')}
			</button>
		);
	}

	return (
		<button type="button" onClick={onSelectAll} className={TEXT_ACTION}>
			{t('collaborate.SELECT_ALL')}
		</button>
	);
}

/** The room link on one line that never scrolls: the address cut with an ellipsis, the whole of it in the copy. */
function RoomLink({ link }: Readonly<{ link: string }>) {
	const t = useTranslations();
	const [isCopied, setIsCopied] = useState(false);

	useEffect(() => {
		if (!isCopied) {
			return;
		}
		const timer = window.setTimeout(() => setIsCopied(false), 2000);

		return () => window.clearTimeout(timer);
	}, [isCopied]);

	const copy = async () => {
		const copied = await copyQuietly(link);
		if (!copied) {
			toast.error(t('collaborate.COPY_FAILED'), { description: link });
			return;
		}
		setIsCopied(true);
	};

	return (
		<section className="flex flex-col gap-2">
			<h3 className={SECTION_LABEL}>{t('collaborate.ROOM_LINK')}</h3>
			<div className={cn(SECTION_SURFACE, 'flex h-11 min-w-0 items-center gap-2.5 pl-3 pr-1.5')}>
				<Link aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
				<span title={link} className="min-w-0 flex-1 truncate text-xs text-foreground">
					{readableLinkOf(link)}
				</span>
				<Button type="button" variant="ghost" size="sm" onClick={copy} className="shrink-0">
					{isCopied && <Check aria-hidden="true" />}
					{!isCopied && <Copy aria-hidden="true" />}
					{isCopied && t('common.COPIED')}
					{!isCopied && t('collaborate.COPY_LINK')}
				</Button>
			</div>
			<p className="flex items-start gap-1.5 text-xs text-muted-foreground text-pretty">
				<Info aria-hidden="true" className="mt-px size-3.5 shrink-0" />
				{t('collaborate.ROOM_LINK_HINT')}
			</p>
		</section>
	);
}

function BoardNote({ hasBoardApp }: Readonly<{ hasBoardApp: boolean }>) {
	const t = useTranslations();

	return (
		<p className="flex items-start gap-1.5 text-xs text-muted-foreground text-pretty">
			<Info aria-hidden="true" className="mt-px size-3.5 shrink-0" />
			{boardNoteOf(hasBoardApp, t)}
		</p>
	);
}

/**
 * Pick teammates, then start a meeting or open the whiteboard. Nothing notifies the people picked, so a meeting
 * shows its link and copies it when it starts; the in-app board is personal, and only the external board app (when
 * the deployment has one) opens live with the people picked.
 */
function CollaborateBody({ onClose }: Readonly<{ onClose: () => void }>) {
	const t = useTranslations();
	const locale = useLocale();
	const router = useRouter();
	const activeTeam = useAtomValue(activeTeamState);
	const timerStatus = useAtomValue(timerStatusState);
	const { data: user } = useUserQuery();
	const [mode, setMode] = useState<CollaborationMode>('meeting');
	const [query, setQuery] = useState('');
	const [pickedIds, setPickedIds] = useState<string[]>([]);
	const [roomSuffix] = useState(() => nanoid(10));
	const [listElement, setListElement] = useState<HTMLUListElement | null>(null);
	const isJitsi = useMemo(() => isJitsiMeeting(), []);

	const people = useMemo(() => {
		const collaborators: Collaborator[] = [];
		for (const member of activeTeam?.members ?? []) {
			const collaborator = collaboratorOf(member, timerStatus);
			const isMe = collaborator?.id === user?.id;
			if (collaborator && !isMe) {
				collaborators.push(collaborator);
			}
		}

		return collaborators;
	}, [activeTeam?.members, timerStatus, user?.id]);

	const normalizedQuery = query.trim().toLowerCase();
	const visiblePeople = useMemo(
		() => people.filter((person) => matchesQuery(person, normalizedQuery)),
		[normalizedQuery, people]
	);
	const pickedPeople = useMemo(() => {
		const picked: Collaborator[] = [];
		for (const id of pickedIds) {
			const person = people.find((candidate) => candidate.id === id);
			if (person) {
				picked.push(person);
			}
		}

		return picked;
	}, [people, pickedIds]);

	const roomName = meetRoomNameFor(activeTeam?.name, pickedPeople, roomSuffix);
	const meetPath = meetPathFor(roomName, isJitsi);
	const roomLink = `${originOf()}${meetPath}`;
	const pickedPersonIds = pickedPeople.map((person) => person.id);
	const board = boardTargetFor(pickedPersonIds, BOARD_APP_DOMAIN.value, originOf());
	const hasBoardApp = Boolean(BOARD_APP_DOMAIN.value);
	const everyone: Person[] = [...meOf(user), ...pickedPeople];

	const togglePerson = useCallback((id: string) => {
		setPickedIds((current) => {
			if (current.includes(id)) {
				return current.filter((pickedId) => pickedId !== id);
			}

			return [...current, id];
		});
	}, []);

	const selectAll = () => {
		const everyoneId = people.map((person) => person.id);
		setPickedIds(everyoneId);
	};

	const clearSelection = () => {
		setPickedIds([]);
	};

	const startMeeting = async () => {
		const hasPeople = pickedPeople.length > 0;
		if (hasPeople) {
			const pickedNames = pickedPeople.map((person) => person.name);
			const listFormat = new Intl.ListFormat(locale, { type: 'conjunction' });
			const names = listFormat.format(pickedNames);
			const isCopied = await copyQuietly(roomLink);
			if (isCopied) {
				toast.success(t('collaborate.LINK_COPIED'), { description: t('collaborate.SEND_LINK_TO', { names }) });
			} else {
				toast.info(t('collaborate.SEND_LINK_TO', { names }), { description: roomLink, duration: 10000 });
			}
		}
		onClose();
		router.push(meetPath);
	};

	const openBoard = () => {
		onClose();
		if (board.isExternal) {
			window.open(board.href, '_blank', 'noreferrer');
			return;
		}
		router.push(board.href);
	};

	const startSession = () => {
		if (mode === 'meeting') {
			void startMeeting();
			return;
		}
		openBoard();
	};

	const preloadMeeting = () => {
		const preparesLiveKit = mode === 'meeting' && !isJitsi;
		if (preparesLiveKit) {
			preloadLiveKit();
		}
	};

	const modeItems: SegmentedControlItem<CollaborationMode>[] = [
		{ value: 'meeting', label: t('collaborate.MEETING'), icon: <VideoCall /> },
		{ value: 'board', label: t('collaborate.BOARD'), icon: <Pencil /> }
	];

	const hasMatches = visiblePeople.length > 0;
	const isTeamEmpty = people.length === 0;
	const hasPicked = pickedPeople.length > 0;

	return (
		<>
			<AppDialogHeader title={t('collaborate.TITLE')} context={<TeamContext />} onClose={onClose} />
			<div className={cn(APP_DIALOG_BODY, 'flex flex-col gap-5 pb-5')}>
				<div className="flex flex-col gap-3">
					<AppDialogDescription className="-mt-1 text-[13px] text-muted-foreground">
						{t('collaborate.DESCRIPTION')}
					</AppDialogDescription>
					<SegmentedControl
						items={modeItems}
						value={mode}
						onValueChange={setMode}
						ariaLabel={t('collaborate.MODE_LABEL')}
						className="flex w-full [&>[data-segment]]:flex-1"
					/>
				</div>
				<div className={cn(SECTION_SURFACE, 'flex flex-col overflow-hidden')}>
					<div className="flex h-11 shrink-0 items-center gap-2 pl-3 pr-1.5">
						<Search aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
						<input
							type="text"
							value={query}
							data-initial-focus=""
							onChange={(event) => setQuery(event.target.value)}
							onKeyDown={(event) => moveFocus(event, listElement)}
							aria-label={t('collaborate.SEARCH_PLACEHOLDER')}
							placeholder={t('collaborate.SEARCH_PLACEHOLDER')}
							className="h-full min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground/75"
						/>
						{!isTeamEmpty && (
							<SelectionToggle hasPicked={hasPicked} onSelectAll={selectAll} onClear={clearSelection} />
						)}
					</div>
					<div className="hairline-t border-border">
						{hasMatches && (
							<ul
								ref={setListElement}
								className="flex max-h-[min(17.5rem,36dvh)] flex-col overflow-y-auto overscroll-contain p-1"
							>
								{visiblePeople.map((person) => (
									<CollaboratorRow
										key={person.id}
										person={person}
										isPicked={pickedIds.includes(person.id)}
										onToggle={togglePerson}
										onKeyDown={(event) => moveFocus(event, listElement)}
									/>
								))}
							</ul>
						)}
						{!hasMatches && (
							<p className="px-4 py-8 text-center text-xs text-muted-foreground text-balance">
								{isTeamEmpty && t('collaborate.NO_TEAMMATES')}
								{!isTeamEmpty && t('collaborate.NO_MATCH', { query: query.trim() })}
							</p>
						)}
					</div>
				</div>
				{mode === 'meeting' && <RoomLink link={roomLink} />}
				{mode === 'board' && <BoardNote hasBoardApp={hasBoardApp} />}
			</div>
			<div className={APP_DIALOG_FOOTER}>
				<span className="flex min-w-0 items-center gap-2">
					<AvatarStack people={everyone} max={4} />
					<span className="truncate text-xs text-muted-foreground" aria-live="polite">
						{t('collaborate.PARTICIPANTS', { count: pickedPeople.length })}
					</span>
				</span>
				<Button
					type="button"
					size="default"
					onClick={startSession}
					onPointerEnter={preloadMeeting}
					onFocus={preloadMeeting}
					className="ml-auto"
				>
					{mode === 'meeting' && <VideoCall aria-hidden="true" />}
					{mode === 'board' && <Pencil aria-hidden="true" />}
					{primaryLabelOf(mode, t)}
				</Button>
			</div>
		</>
	);
}

export function CollaborateDialog({ open, onClose }: Readonly<{ open: boolean; onClose: () => void }>) {
	return (
		<AppDialog open={open} onClose={onClose} width="md">
			<CollaborateBody onClose={onClose} />
		</AppDialog>
	);
}
