'use client';

import { useCallback, useMemo, type ReactNode } from 'react';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { CommandGroup, CommandItem, commandIconTileClass } from '@/core/components/common/command';
import { FileText, Folder, Task } from '@/core/components/icons';
import { PersonAvatar } from '@/core/components/teams/people-avatars';
import { useOrganizationProjectsQuery } from '@/core/hooks/organizations/projects/use-organization-projects-query';
import { useDocsSearch } from '@/core/hooks/docs/use-docs-search';
import {
	matchingItems,
	pageItemsOf,
	PALETTE_RESULTS_LIMIT,
	paletteValueOf,
	personItemsOf,
	projectItemsOf,
	type PaletteItem,
	type PaletteItemKind
} from '@/core/lib/utils/palette-items';
import { activeTeamState } from '@/core/stores';

interface ResultsProps {
	search: string;
	onOpen: (item: PaletteItem) => void;
	className?: string;
}

const KIND_ICONS: Record<PaletteItemKind, ReactNode> = {
	task: <Task aria-hidden="true" />,
	person: null,
	project: <Folder aria-hidden="true" />,
	page: <FileText aria-hidden="true" />
};

function ItemIcon({ item }: Readonly<{ item: PaletteItem }>) {
	if (item.kind === 'person') {
		return (
			<PersonAvatar
				person={{ id: item.id, name: item.title, imageUrl: item.imageUrl }}
				className="size-7 text-[10px] ring-0"
			/>
		);
	}
	if (item.icon) {
		return (
			<span className={commandIconTileClass} aria-hidden="true">
				{item.icon}
			</span>
		);
	}
	return <span className={commandIconTileClass}>{KIND_ICONS[item.kind]}</span>;
}

function PaletteItemRow({
	item,
	search,
	subtitle,
	onOpen
}: Readonly<{ item: PaletteItem; search: string; subtitle?: string; onOpen: (item: PaletteItem) => void }>) {
	const open = useCallback(() => onOpen(item), [item, onOpen]);
	// Already matched here: the search itself is a keyword, so the palette's own filter keeps the row.
	const keywords = search ? [search] : undefined;
	return (
		<CommandItem
			value={paletteValueOf(item)}
			keywords={keywords}
			onSelect={open}
			className="min-h-10 gap-3 rounded-lg px-2 text-sm"
		>
			<ItemIcon item={item} />
			<span className="flex min-w-0 flex-1 flex-col">
				<span className="truncate text-foreground">{item.title}</span>
				{subtitle && <span className="truncate text-xs text-muted-foreground">{subtitle}</span>}
			</span>
		</CommandItem>
	);
}

function ResultsGroup({
	heading,
	items,
	search,
	onOpen,
	className
}: Readonly<{
	heading: string;
	items: PaletteItem[];
	search: string;
	onOpen: (item: PaletteItem) => void;
	className?: string;
}>) {
	if (!items.length) {
		return null;
	}
	return (
		<CommandGroup heading={heading} className={className}>
			{items.map((item) => (
				<PaletteItemRow key={`${item.kind}:${item.id}`} item={item} search={search} onOpen={onOpen} />
			))}
		</CommandGroup>
	);
}

const KIND_LABEL_KEYS = {
	task: 'commandPalette.results.tasks',
	person: 'commandPalette.results.people',
	project: 'commandPalette.results.projects',
	page: 'commandPalette.results.pages'
} as const satisfies Record<PaletteItemKind, string>;

/** The entries last opened from the palette, while its field is empty; each says what it is. */
export function PaletteRecentResults({
	items,
	onOpen,
	className
}: Readonly<{ items: PaletteItem[]; onOpen: (item: PaletteItem) => void; className?: string }>) {
	const t = useTranslations();
	if (!items.length) {
		return null;
	}
	return (
		<CommandGroup heading={t('commandPalette.results.recentlyOpened')} className={className}>
			{items.map((item) => (
				<PaletteItemRow
					key={`${item.kind}:${item.id}`}
					item={item}
					search=""
					subtitle={t(KIND_LABEL_KEYS[item.kind])}
					onOpen={onOpen}
				/>
			))}
		</CommandGroup>
	);
}

/** The people of the active team whose name matches, each leading to their profile. */
export function PalettePeopleResults({ search, onOpen, className }: Readonly<ResultsProps>) {
	const t = useTranslations();
	const activeTeam = useAtomValue(activeTeamState);
	const people = useMemo(() => personItemsOf(activeTeam?.members), [activeTeam?.members]);
	const items = useMemo(() => matchingItems(people, search), [people, search]);
	return (
		<ResultsGroup
			heading={t('commandPalette.results.people')}
			items={items}
			search={search}
			onOpen={onOpen}
			className={className}
		/>
	);
}

/** The projects of the organization whose name matches (archived ones left out). */
export function PaletteProjectResults({ search, onOpen, className }: Readonly<ResultsProps>) {
	const t = useTranslations();
	const { organizationProjects } = useOrganizationProjectsQuery();
	const projects = useMemo(() => projectItemsOf(organizationProjects), [organizationProjects]);
	const items = useMemo(() => matchingItems(projects, search), [projects, search]);
	return (
		<ResultsGroup
			heading={t('commandPalette.results.projects')}
			items={items}
			search={search}
			onOpen={onOpen}
			className={className}
		/>
	);
}

/** The Docs pages the platform finds for the search (their text too), best match first. */
export function PalettePageResults({ search, onOpen, className }: Readonly<ResultsProps>) {
	const t = useTranslations();
	const { results } = useDocsSearch(search, true);
	const untitled = t('commandPalette.results.untitledPage');
	const items = useMemo(() => pageItemsOf(results, untitled).slice(0, PALETTE_RESULTS_LIMIT), [results, untitled]);
	return (
		<ResultsGroup
			heading={t('commandPalette.results.pages')}
			items={items}
			search={search}
			onOpen={onOpen}
			className={className}
		/>
	);
}
