'use client';

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Checkbox } from '@/core/components/common/checkbox';
import { Input } from '@/core/components/common/input';
import { AppGlyph } from '@/core/components/common/app-switcher/app-glyph';
import { LauncherChips } from '@/core/components/common/app-switcher/launcher-chips';
import { buttonVariants } from '@/core/components/duplicated-components/_button';
import { ArrowDown, ArrowUp, DragHandle, Trash } from '@/core/components/icons/hugeicons';
import { useAppLauncher } from '@/core/hooks/common/use-app-launcher';
import { cn } from '@/core/lib/helpers';
import {
	APP_LAUNCHER_CUSTOM_LIMIT,
	APP_LAUNCHER_PIN_LIMIT,
	withCustomApp,
	withMoved,
	withoutCustomApp,
	withPinned,
	withShown,
	type AppLauncherPreferences,
	type LauncherItem,
	type LauncherSection,
	type LauncherSectionId
} from '@/core/lib/utils/app-launcher';

/** The id the launcher's "Manage apps" link points at (`#manage-apps`). */
export const MANAGE_APPS_SECTION_ID = 'manage-apps';

const SECTION_LABEL_KEYS = {
	pinned: 'switchers.PINNED',
	ever: 'switchers.EVER_APPS',
	yours: 'switchers.YOUR_APPS'
} as const satisfies Record<LauncherSectionId, string>;

const ICON_BUTTON = cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), 'text-muted-foreground');

/** The Show and Pin columns: one width, so the boxes line up from row to row and under their headings. */
const CHECK_COLUMN = 'flex w-10 shrink-0 justify-center';

/** `randomUUID` needs a secure context; `getRandomValues` works on a plain-http self-hosted deployment too. */
function newCustomAppId() {
	if (typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	const bytes = crypto.getRandomValues(new Uint8Array(16));
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** The launcher's link lands on `#manage-apps`; the page renders after the navigation, so scroll once it is there. */
function useScrollToHash(id: string) {
	useEffect(() => {
		if (window.location.hash !== `#${id}`) {
			return;
		}
		document.getElementById(id)?.scrollIntoView({ block: 'start' });
	}, [id]);
}

interface RowProps {
	item: LauncherItem;
	section: LauncherSection;
	index: number;
	isPinBudgetSpent: boolean;
	draggingKey: string | null;
	onDragStart: (key: string) => void;
	onDragEnd: () => void;
	onDrop: (index: number) => void;
	onShow: (item: LauncherItem, isShown: boolean) => void;
	onPin: (item: LauncherItem, isPinned: boolean) => void;
	onMove: (item: LauncherItem, to: number) => void;
	onRemove: (item: LauncherItem) => void;
}

function ManageRow({
	item,
	section,
	index,
	isPinBudgetSpent,
	draggingKey,
	onDragStart,
	onDragEnd,
	onDrop,
	onShow,
	onPin,
	onMove,
	onRemove
}: Readonly<RowProps>) {
	const t = useTranslations();
	const isFirst = index === 0;
	const isLast = index === section.items.length - 1;
	const isPinLocked = !item.isPinned && isPinBudgetSpent;
	const isCustom = item.home === 'yours';
	const isDragging = draggingKey === item.key;
	const name = item.name;

	// The handle is the row's keyboard control: Alt+Up / Alt+Down move the row, as in Ever Works.
	const onHandleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
		if (!event.altKey) {
			return;
		}
		if (event.key === 'ArrowUp') {
			event.preventDefault();
			onMove(item, index - 1);
		}
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			onMove(item, index + 1);
		}
	};

	let showTitle: string | undefined;
	if (item.isCurrent) {
		showTitle = t('settings.preferences.MANAGE_APPS_CURRENT');
	}
	let pinTitle: string | undefined;
	if (isPinLocked) {
		pinTitle = t('settings.preferences.MANAGE_APPS_PIN_LIMIT', { limit: APP_LAUNCHER_PIN_LIMIT });
	}

	return (
		<li
			data-testid="manage-apps-row"
			data-key={item.key}
			data-name={name}
			onDragOver={(event) => {
				if (draggingKey !== null) {
					event.preventDefault();
				}
			}}
			onDrop={(event) => {
				event.preventDefault();
				onDrop(index);
			}}
			className={cn(
				'flex h-12 items-center gap-2 hairline-t border-border px-2 first:border-t-0 has-[[data-control=handle]:focus-visible]:bg-foreground/[0.03] sm:px-3',
				isDragging && 'opacity-50'
			)}
		>
			<button
				type="button"
				draggable
				data-control="handle"
				aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
				aria-label={t('settings.preferences.MANAGE_APPS_REORDER', { name })}
				title={t('settings.preferences.MANAGE_APPS_REORDER', { name })}
				onDragStart={(event) => {
					event.dataTransfer.effectAllowed = 'move';
					onDragStart(item.key);
				}}
				onDragEnd={onDragEnd}
				onKeyDown={onHandleKeyDown}
				className="flex h-7 w-5 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground/70 outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25 active:cursor-grabbing"
			>
				<DragHandle className="size-4" aria-hidden="true" />
			</button>
			<AppGlyph item={item} />
			<div className="flex min-w-0 flex-1 items-center gap-2">
				<span className="min-w-0 truncate text-[13px] font-medium text-foreground">{name}</span>
				<LauncherChips item={item} />
				{item.domain && (
					<span className="hidden min-w-0 truncate text-xs text-muted-foreground sm:inline">
						{item.domain}
					</span>
				)}
			</div>
			<span className={CHECK_COLUMN} title={showTitle}>
				<Checkbox
					data-control="show"
					checked={item.isShown}
					disabled={item.isCurrent}
					aria-label={t('settings.preferences.MANAGE_APPS_SHOW', { name })}
					onCheckedChange={(checked) => onShow(item, checked === true)}
				/>
			</span>
			<span className={CHECK_COLUMN} title={pinTitle}>
				<Checkbox
					data-control="pin"
					checked={item.isPinned}
					disabled={isPinLocked}
					aria-label={t('settings.preferences.MANAGE_APPS_PIN', { name })}
					onCheckedChange={(checked) => onPin(item, checked === true)}
				/>
			</span>
			<div className="flex shrink-0 items-center">
				<button
					type="button"
					data-control="up"
					disabled={isFirst}
					aria-label={t('settings.preferences.MANAGE_APPS_MOVE_UP', { name })}
					title={t('settings.preferences.MANAGE_APPS_MOVE_UP', { name })}
					onClick={() => onMove(item, index - 1)}
					className={ICON_BUTTON}
				>
					<ArrowUp className="size-4" aria-hidden="true" />
				</button>
				<button
					type="button"
					data-control="down"
					disabled={isLast}
					aria-label={t('settings.preferences.MANAGE_APPS_MOVE_DOWN', { name })}
					title={t('settings.preferences.MANAGE_APPS_MOVE_DOWN', { name })}
					onClick={() => onMove(item, index + 1)}
					className={ICON_BUTTON}
				>
					<ArrowDown className="size-4" aria-hidden="true" />
				</button>
				{/* Every row keeps the remove column, so the arrows line up whether a row has the button or not. */}
				<span className="flex size-7 items-center justify-center">
					{isCustom && (
						<button
							type="button"
							aria-label={t('settings.preferences.MANAGE_APPS_REMOVE', { name })}
							title={t('settings.preferences.MANAGE_APPS_REMOVE', { name })}
							onClick={() => onRemove(item)}
							className={ICON_BUTTON}
						>
							<Trash className="size-4" aria-hidden="true" />
						</button>
					)}
				</span>
			</div>
		</li>
	);
}

type AddError = 'name' | 'url' | 'limit' | null;

const ADD_ERROR_KEYS = {
	name: 'settings.preferences.ADD_APP_NAME_REQUIRED',
	url: 'settings.preferences.ADD_APP_URL_INVALID',
	limit: 'settings.preferences.ADD_APP_LIMIT'
} as const;

function AddCustomAppForm({
	preferences,
	onAdd
}: Readonly<{ preferences: AppLauncherPreferences; onAdd: (next: AppLauncherPreferences, name: string) => void }>) {
	const t = useTranslations();
	const nameId = useId();
	const urlId = useId();
	const errorId = useId();
	const [name, setName] = useState('');
	const [url, setUrl] = useState('');
	const [error, setError] = useState<AddError>(null);

	const submit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const result = withCustomApp(preferences, { name, url }, newCustomAppId());
		if (!result.ok) {
			setError(result.reason);
			return;
		}
		setError(null);
		setName('');
		setUrl('');
		onAdd(result.preferences, name.trim());
	};

	let errorText = '';
	if (error) {
		errorText = t(ADD_ERROR_KEYS[error], { limit: APP_LAUNCHER_CUSTOM_LIMIT });
	}

	return (
		<form onSubmit={submit} noValidate className="flex flex-col gap-3 hairline-t border-border px-4 py-4">
			<div>
				<h3 className="text-[13px] font-medium text-foreground">{t('settings.preferences.ADD_APP_TITLE')}</h3>
				<p className="mt-0.5 text-xs text-pretty text-muted-foreground">
					{t('settings.preferences.ADD_APP_DESCRIPTION')}
				</p>
			</div>
			<div className="flex flex-col gap-2 sm:flex-row sm:items-end">
				<label htmlFor={nameId} className="flex min-w-0 flex-col gap-1.5 sm:w-44">
					<span className="text-xs font-medium text-muted-foreground">
						{t('settings.preferences.ADD_APP_NAME')}
					</span>
					<Input
						id={nameId}
						value={name}
						maxLength={60}
						autoComplete="off"
						aria-invalid={error === 'name' || undefined}
						aria-describedby={error ? errorId : undefined}
						onChange={(event) => setName(event.target.value)}
					/>
				</label>
				<label htmlFor={urlId} className="flex min-w-0 flex-1 flex-col gap-1.5">
					<span className="text-xs font-medium text-muted-foreground">
						{t('settings.preferences.ADD_APP_URL')}
					</span>
					<Input
						id={urlId}
						type="url"
						inputMode="url"
						value={url}
						placeholder="https://"
						autoComplete="off"
						aria-invalid={error === 'url' || undefined}
						aria-describedby={error ? errorId : undefined}
						onChange={(event) => setUrl(event.target.value)}
					/>
				</label>
				<button type="submit" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'shrink-0')}>
					{t('settings.preferences.ADD_APP_SUBMIT')}
				</button>
			</div>
			{error && (
				<p id={errorId} role="alert" className="text-xs text-destructive-ink">
					{errorText}
				</p>
			)}
		</form>
	);
}

/**
 * Manage apps (spec A3, as Ever Works' `/settings/app-launcher`): per app Show, Pin (six at most) and the order,
 * by the arrows, by dragging a row, or with Alt+Up / Alt+Down on a focused row. Saved as you go, in this browser.
 */
export function AppLauncherManage() {
	const t = useTranslations();
	const { preferences, setPreferences, manageSections } = useAppLauncher();
	const [draggingKey, setDraggingKey] = useState<string | null>(null);
	const [announcement, setAnnouncement] = useState('');
	const listRef = useRef<HTMLDivElement>(null);
	useScrollToHash(MANAGE_APPS_SECTION_ID);

	const pinCount = preferences.pinned.length;
	const isPinBudgetSpent = pinCount >= APP_LAUNCHER_PIN_LIMIT;

	/**
	 * Keep the keyboard where it was: pinning, unpinning or hiding moves a row to another section, where it mounts
	 * again, so the same control of the same row takes the focus back once it is drawn (the handle when that
	 * control is now disabled, as the up arrow of a row that reached the top).
	 */
	const keepFocusOn = (key: string) => {
		const active = document.activeElement;
		const isInRow = active instanceof HTMLElement && active.closest(`[data-key="${key}"]`) !== null;
		const control = isInRow ? active.dataset.control : undefined;
		if (!control) {
			return;
		}
		requestAnimationFrame(() => {
			const row = listRef.current?.querySelector<HTMLElement>(`[data-key="${key}"]`);
			const same = row?.querySelector<HTMLElement>(`[data-control="${control}"]:not(:disabled)`);
			const handle = row?.querySelector<HTMLElement>('[data-control="handle"]');
			(same ?? handle)?.focus();
		});
	};

	/**
	 * A browser that refuses the write (storage full or blocked) keeps the choice for this page only, as for the
	 * launcher's position: say so in the status line instead of "Saved".
	 */
	const save = (key: string, next: AppLauncherPreferences, message: string) => {
		keepFocusOn(key);
		try {
			setPreferences(next);
			setAnnouncement(message);
		} catch {
			setAnnouncement(t('settings.preferences.SYNC_SAVE_FAILED'));
		}
	};

	const saved = t('settings.preferences.MANAGE_APPS_SAVED');

	const sectionOf = (item: LauncherItem) =>
		manageSections.find((section) => section.items.some((entry) => entry.key === item.key));

	const move = (item: LauncherItem, to: number) => {
		const section = sectionOf(item);
		if (!section) {
			return;
		}
		const position = Math.min(Math.max(to, 0), section.items.length - 1);
		save(
			item.key,
			withMoved(preferences, section, item.key, position),
			t('settings.preferences.MANAGE_APPS_MOVED', { name: item.name, position: position + 1 })
		);
	};

	const drop = (section: LauncherSection, index: number) => {
		const key = draggingKey;
		setDraggingKey(null);
		const item = section.items.find((entry) => entry.key === key);
		if (!item) {
			// A row dragged from another section stays where it is: pinning is what moves a row between them.
			return;
		}
		move(item, index);
	};

	return (
		<div ref={listRef}>
			<div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
				<p className="text-xs text-muted-foreground tabular-nums">
					{t('settings.preferences.MANAGE_APPS_PIN_COUNT', {
						count: pinCount,
						limit: APP_LAUNCHER_PIN_LIMIT
					})}
				</p>
				<p role="status" aria-live="polite" className="text-xs text-muted-foreground">
					{announcement}
				</p>
			</div>
			{manageSections.map((section) => (
				<SectionList
					key={section.id}
					section={section}
					isPinBudgetSpent={isPinBudgetSpent}
					draggingKey={draggingKey}
					onDragStart={setDraggingKey}
					onDragEnd={() => setDraggingKey(null)}
					onDrop={(index) => drop(section, index)}
					onShow={(item, isShown) => save(item.key, withShown(preferences, item.key, isShown), saved)}
					onPin={(item, isPinned) => save(item.key, withPinned(preferences, item.key, isPinned), saved)}
					onMove={move}
					onRemove={(item) => save(item.key, withoutCustomApp(preferences, item.key), saved)}
				/>
			))}
			<p className="px-4 pt-1 pb-3 text-xs text-pretty text-muted-foreground">
				{t('settings.preferences.MANAGE_APPS_REORDER_HINT')}
			</p>
			<AddCustomAppForm preferences={preferences} onAdd={(next) => save('', next, saved)} />
		</div>
	);
}

type SectionListProps = Omit<RowProps, 'item' | 'section' | 'index'> & { section: LauncherSection };

function SectionList({ section, ...rowProps }: Readonly<SectionListProps>) {
	const t = useTranslations();
	const headingId = useId();
	return (
		<div data-section={section.id} className="pb-2">
			<div className="flex items-center gap-2 px-4 pt-2 pb-1 sm:px-6">
				<h3 id={headingId} className="min-w-0 flex-1 truncate pl-7 text-xs font-medium text-muted-foreground">
					{t(SECTION_LABEL_KEYS[section.id])}
				</h3>
				<span aria-hidden="true" className={cn(CHECK_COLUMN, 'text-xs text-muted-foreground')}>
					{t('settings.preferences.MANAGE_APPS_COLUMN_SHOW')}
				</span>
				<span aria-hidden="true" className={cn(CHECK_COLUMN, 'text-xs text-muted-foreground')}>
					{t('settings.preferences.MANAGE_APPS_COLUMN_PIN')}
				</span>
				<span aria-hidden="true" className="w-[84px] shrink-0" />
			</div>
			<ul aria-labelledby={headingId} className="mx-2 rounded-lg hairline-ring ring-border sm:mx-3">
				{section.items.map((item, index) => (
					<ManageRow key={item.key} item={item} section={section} index={index} {...rowProps} />
				))}
			</ul>
		</div>
	);
}
