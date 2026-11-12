import {
	AlertDiamondIcon,
	Alert02Icon,
	Analytics01Icon,
	ArrowDown01Icon,
	ArrowUp01Icon,
	Attachment01Icon,
	Book02Icon,
	Bookmark01Icon,
	Briefcase01Icon,
	BubbleChatIcon,
	Bug01Icon,
	Building03Icon,
	Calendar03Icon,
	Cancel01Icon,
	CancelCircleIcon,
	ChartLineData01Icon,
	CheckListIcon,
	CheckmarkCircle02Icon,
	CircleIcon,
	Clock01Icon,
	CloudIcon,
	CodeIcon,
	CommandLineIcon,
	Comment01Icon,
	ComputerIcon,
	Crown02Icon,
	CubeIcon,
	DashedLineCircleIcon,
	Database01Icon,
	Diamond01Icon,
	EyeIcon,
	FavouriteIcon,
	File01Icon,
	Fire02Icon,
	Flag01Icon,
	Flag02Icon,
	FlashIcon,
	Folder01Icon,
	Globe02Icon,
	HeartCheckIcon,
	Home01Icon,
	HourglassIcon,
	Idea01Icon,
	Image01Icon,
	Key01Icon,
	Layers01Icon,
	Leaf01Icon,
	Link01Icon,
	Loading03Icon,
	LockIcon,
	Mail01Icon,
	Medal01Icon,
	Megaphone01Icon,
	MinusSignIcon,
	Money01Icon,
	Moon02Icon,
	Notification01Icon,
	Package01Icon,
	PaintBoardIcon,
	PaintBrush01Icon,
	PauseCircleIcon,
	PieChartIcon,
	PlayCircleIcon,
	PuzzleIcon,
	Rocket01Icon,
	Search01Icon,
	SearchList01Icon,
	ServerStack01Icon,
	Settings01Icon,
	Shield01Icon,
	SignalFull01Icon,
	SignalLow01Icon,
	SignalMedium01Icon,
	SmartPhone01Icon,
	SmileIcon,
	StarIcon,
	StopCircleIcon,
	Sun01Icon,
	Tag01Icon,
	Target02Icon,
	Task01Icon,
	TaskDone01Icon,
	TestTube01Icon,
	ThumbsUpIcon,
	Timer01Icon,
	UserGroupIcon,
	UserIcon,
	Wrench01Icon,
	ZapIcon
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { ComponentProps, ReactNode } from 'react';

/**
 * The icons a task status, priority, size or issue type can take, from Hugeicons (the app's icon library, see
 * `hugeicons.tsx`). The file stays out of the icons barrel: only the icon picker and the renderer of a chosen icon load
 * it, lazily, so no page pays for the catalog until someone picks or shows a library icon.
 *
 * `key` is what gets stored (`hugeicons:<key>`, see `property-icon-value.ts`): never rename one, only add.
 */
export type PropertyIconCategory = 'progress' | 'priority' | 'size' | 'work' | 'objects' | 'symbols';

export const PROPERTY_ICON_CATEGORIES: ReadonlyArray<PropertyIconCategory> = [
	'progress',
	'priority',
	'size',
	'work',
	'objects',
	'symbols'
];

type CatalogGlyph = ComponentProps<typeof HugeiconsIcon>['icon'];

export interface PropertyIconEntry {
	key: string;
	category: PropertyIconCategory;
	/** Words a search matches, besides the key. */
	keywords: string;
	glyph: CatalogGlyph;
}

const entry = (key: string, category: PropertyIconCategory, glyph: CatalogGlyph, keywords = ''): PropertyIconEntry => ({
	key,
	category,
	glyph,
	keywords
});

export const PROPERTY_ICON_CATALOG: ReadonlyArray<PropertyIconEntry> = [
	entry('circle', 'progress', CircleIcon, 'open todo to do new'),
	entry('circle-dashed', 'progress', DashedLineCircleIcon, 'backlog draft later'),
	entry('in-progress', 'progress', Loading03Icon, 'started doing working ongoing'),
	entry('clock', 'progress', Clock01Icon, 'waiting pending time'),
	entry('play', 'progress', PlayCircleIcon, 'start running active'),
	entry('pause', 'progress', PauseCircleIcon, 'on hold paused'),
	entry('stop', 'progress', StopCircleIcon, 'stopped halted'),
	entry('in-review', 'progress', EyeIcon, 'review watching seen'),
	entry('testing', 'progress', SearchList01Icon, 'qa check verify'),
	entry('checklist', 'progress', CheckListIcon, 'ready list steps'),
	entry('done', 'progress', CheckmarkCircle02Icon, 'completed complete finished closed check'),
	entry('task-done', 'progress', TaskDone01Icon, 'completed shipped delivered'),
	entry('blocked', 'progress', Cancel01Icon, 'stuck no'),
	entry('cancelled', 'progress', CancelCircleIcon, 'canceled rejected wontfix'),
	entry('alert', 'progress', Alert02Icon, 'warning attention risk'),

	entry('urgent', 'priority', AlertDiamondIcon, 'critical asap blocker'),
	entry('fire', 'priority', Fire02Icon, 'hot critical urgent'),
	entry('flash', 'priority', FlashIcon, 'quick fast high'),
	entry('flag', 'priority', Flag01Icon, 'important mark'),
	entry('flag-outline', 'priority', Flag02Icon, 'important mark'),
	entry('arrow-up', 'priority', ArrowUp01Icon, 'high raise'),
	entry('arrow-down', 'priority', ArrowDown01Icon, 'low lower'),
	entry('signal-high', 'priority', SignalFull01Icon, 'high bars'),
	entry('signal-medium', 'priority', SignalMedium01Icon, 'medium normal bars'),
	entry('signal-low', 'priority', SignalLow01Icon, 'low bars'),
	entry('no-priority', 'priority', MinusSignIcon, 'none dash'),
	entry('star', 'priority', StarIcon, 'favorite featured'),

	entry('cube', 'size', CubeIcon, 'small block unit'),
	entry('package', 'size', Package01Icon, 'medium box'),
	entry('layers', 'size', Layers01Icon, 'large stack'),
	entry('puzzle', 'size', PuzzleIcon, 'piece part'),
	entry('diamond', 'size', Diamond01Icon, 'extra large xl'),
	entry('hourglass', 'size', HourglassIcon, 'effort time long'),
	entry('timer', 'size', Timer01Icon, 'effort time short'),
	entry('calendar', 'size', Calendar03Icon, 'days week sprint'),

	entry('bug', 'work', Bug01Icon, 'defect issue error fix'),
	entry('task', 'work', Task01Icon, 'todo work item'),
	entry('story', 'work', Book02Icon, 'user story feature'),
	entry('epic', 'work', Rocket01Icon, 'launch initiative'),
	entry('goal', 'work', Target02Icon, 'target objective'),
	entry('idea', 'work', Idea01Icon, 'improvement suggestion'),
	entry('test', 'work', TestTube01Icon, 'qa experiment'),
	entry('code', 'work', CodeIcon, 'development engineering'),
	entry('terminal', 'work', CommandLineIcon, 'cli devops script'),
	entry('design', 'work', PaintBrush01Icon, 'ui ux visual'),
	entry('palette', 'work', PaintBoardIcon, 'brand colors'),
	entry('settings', 'work', Settings01Icon, 'configuration setup'),
	entry('maintenance', 'work', Wrench01Icon, 'repair chore tooling'),
	entry('security', 'work', Shield01Icon, 'protection safety'),
	entry('lock', 'work', LockIcon, 'private access'),
	entry('key', 'work', Key01Icon, 'access credentials'),
	entry('database', 'work', Database01Icon, 'data storage'),
	entry('server', 'work', ServerStack01Icon, 'backend infrastructure'),
	entry('cloud', 'work', CloudIcon, 'hosting deployment'),
	entry('web', 'work', Globe02Icon, 'website internet'),
	entry('mobile', 'work', SmartPhone01Icon, 'phone app'),
	entry('desktop', 'work', ComputerIcon, 'computer app'),
	entry('analytics', 'work', Analytics01Icon, 'metrics stats'),
	entry('chart', 'work', ChartLineData01Icon, 'report growth'),
	entry('pie-chart', 'work', PieChartIcon, 'report share'),
	entry('money', 'work', Money01Icon, 'finance billing cost'),

	entry('file', 'objects', File01Icon, 'document'),
	entry('folder', 'objects', Folder01Icon, 'directory'),
	entry('image', 'objects', Image01Icon, 'picture photo'),
	entry('link', 'objects', Link01Icon, 'url'),
	entry('attachment', 'objects', Attachment01Icon, 'clip file'),
	entry('bookmark', 'objects', Bookmark01Icon, 'saved'),
	entry('tag', 'objects', Tag01Icon, 'label'),
	entry('home', 'objects', Home01Icon, 'house'),
	entry('building', 'objects', Building03Icon, 'office company'),
	entry('briefcase', 'objects', Briefcase01Icon, 'work business client'),
	entry('mail', 'objects', Mail01Icon, 'email message'),
	entry('chat', 'objects', BubbleChatIcon, 'message conversation'),
	entry('comment', 'objects', Comment01Icon, 'feedback note'),
	entry('announcement', 'objects', Megaphone01Icon, 'marketing news'),
	entry('notification', 'objects', Notification01Icon, 'bell alert'),
	entry('user', 'objects', UserIcon, 'person member'),
	entry('team', 'objects', UserGroupIcon, 'people group'),
	entry('search', 'objects', Search01Icon, 'find research'),

	entry('heart', 'symbols', FavouriteIcon, 'love like'),
	entry('heart-check', 'symbols', HeartCheckIcon, 'health approved'),
	entry('thumbs-up', 'symbols', ThumbsUpIcon, 'approved like ok'),
	entry('smile', 'symbols', SmileIcon, 'happy'),
	entry('medal', 'symbols', Medal01Icon, 'award achievement'),
	entry('crown', 'symbols', Crown02Icon, 'premium vip'),
	entry('leaf', 'symbols', Leaf01Icon, 'green nature'),
	entry('sun', 'symbols', Sun01Icon, 'day light'),
	entry('moon', 'symbols', Moon02Icon, 'night dark'),
	entry('zap', 'symbols', ZapIcon, 'energy power')
];

const ENTRY_BY_KEY = new Map(PROPERTY_ICON_CATALOG.map((item) => [item.key, item]));

/** The catalog entry of a stored key, or undefined for a key this version does not know. */
export function propertyIconEntryOf(key: string): PropertyIconEntry | undefined {
	return ENTRY_BY_KEY.get(key);
}

/** The words an entry is shown and searched by: its key with spaces, then its keywords. */
export function propertyIconWordsOf(item: PropertyIconEntry): string {
	return `${item.key.split('-').join(' ')} ${item.keywords}`.trim();
}

/** Whether every word of the query starts a word of the entry. */
export function propertyIconMatches(item: PropertyIconEntry, query: string): boolean {
	const needles = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
	if (needles.length === 0) {
		return true;
	}
	const words = propertyIconWordsOf(item).toLowerCase().split(/\s+/);
	return needles.every((needle) => words.some((word) => word.startsWith(needle)));
}

type LibraryIconProps = Readonly<{ iconKey: string; className?: string; fallback?: ReactNode }>;

/** A library icon drawn with the app's stroke; the fallback for a key this version does not know. */
export function LibraryIcon({ iconKey, className, fallback = null }: LibraryIconProps) {
	const item = propertyIconEntryOf(iconKey);
	if (!item) {
		return <>{fallback}</>;
	}
	return <HugeiconsIcon icon={item.glyph} strokeWidth={1.75} className={className} aria-hidden="true" />;
}
