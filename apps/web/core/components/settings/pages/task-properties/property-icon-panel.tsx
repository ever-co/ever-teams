'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/core/components/common/input';
import { SegmentedControl, type SegmentedControlItem } from '@/core/components/common/segmented-control';
import {
	LibraryIcon,
	PROPERTY_ICON_CATALOG,
	PROPERTY_ICON_CATEGORIES,
	propertyIconMatches
} from '@/core/components/icons/property-icon-catalog';
import {
	classicIconGlyphOf,
	isUploadedIcon,
	libraryIconKeyOf,
	libraryIconValue
} from '@/core/lib/utils/property-icon-value';
import { TaskPropertyIcon } from '@/core/components/tasks/task-property-icon';
import {
	iconOptionLabel,
	iconOptionMatches,
	propertyIconOptions,
	type TaskPropertySettingsKind
} from '@/core/lib/utils/settings-task-properties';
import { useCanUploadPropertyIcon } from '@/core/hooks/settings/use-can-upload-property-icon';
import { CLASSIC_ICON_GROUP_LABEL_KEYS, CLASSIC_ICONS_LABEL_KEY, ICON_CATEGORY_LABEL_KEYS } from './property-i18n';
import { PropertyIconUpload } from './property-icon-upload';

const GROUP_LABEL = 'px-2 pt-1.5 pb-1 text-xs font-medium text-muted-foreground';
const ICON_GRID = 'grid grid-cols-7 gap-0.5 px-1 pb-1';
const ICON_CELL =
	'flex size-8 cursor-pointer items-center justify-center rounded-md text-foreground outline-none hover:bg-foreground/[0.06] focus-visible:ring-[3px] focus-visible:ring-ring/25 aria-pressed:bg-primary/10 aria-pressed:text-primary aria-pressed:ring-1 aria-pressed:ring-primary/40';

type IconSource = 'library' | 'upload';

interface PropertyIconPanelProps {
	kind: TaskPropertySettingsKind;
	/** The stored icon, see `property-icon-value.ts`. */
	value: string | null;
	/** The `fullIconUrl` of the stored icon, where an uploaded one held outside Gauzy loads from. */
	valueUrl?: string | null;
	onPick: (value: string) => void;
}

/**
 * The icons a property can take: the library, or an image the user uploads, for a user Gauzy lets upload images. It
 * opens on the upload of a property that has one, so the current image and its replacement are one step away.
 */
export function PropertyIconPanel({ kind, value, valueUrl, onPick }: Readonly<PropertyIconPanelProps>) {
	const t = useTranslations();
	const canUpload = useCanUploadPropertyIcon();
	const [source, setSource] = useState<IconSource>(() => (isUploadedIcon(value) ? 'upload' : 'library'));
	const sources: ReadonlyArray<SegmentedControlItem<IconSource>> = [
		{ value: 'library', label: t('settings.taskProperties.ICON_TAB_LIBRARY') },
		{ value: 'upload', label: t('settings.taskProperties.ICON_TAB_UPLOAD') }
	];

	if (!canUpload) {
		return (
			<div className="flex flex-col">
				<LibraryIconPanel kind={kind} value={value} onPick={onPick} />
			</div>
		);
	}

	return (
		<div className="flex flex-col">
			<div className="px-1.5 pt-1.5">
				<SegmentedControl
					items={sources}
					value={source}
					onValueChange={setSource}
					ariaLabel={t('settings.taskProperties.ICON_SOURCE')}
				/>
			</div>
			{source === 'library' && <LibraryIconPanel kind={kind} value={value} onPick={onPick} />}
			{source === 'upload' && (
				<PropertyIconUpload kind={kind} value={value} valueUrl={valueUrl} onPick={onPick} />
			)}
		</div>
	);
}

/**
 * The icon library by category, then the classic icons Gauzy serves, kept so a property can go back to one. One
 * search filters both: a library icon by its words, a classic one by its name.
 */
function LibraryIconPanel({ kind, value, onPick }: Readonly<Omit<PropertyIconPanelProps, 'valueUrl'>>) {
	const t = useTranslations();
	const [query, setQuery] = useState('');
	const currentLibraryKey = libraryIconKeyOf(value);

	const libraryGroups = PROPERTY_ICON_CATEGORIES.map((category) => ({
		category,
		items: PROPERTY_ICON_CATALOG.filter((item) => item.category === category && propertyIconMatches(item, query))
	})).filter((group) => group.items.length > 0);
	const classicOptions = useMemo(() => propertyIconOptions(kind), [kind]);
	const visibleClassicOptions = classicOptions.filter((option) => iconOptionMatches(option, query));
	const hasResults = libraryGroups.length > 0 || visibleClassicOptions.length > 0;
	const classicLabel = t(CLASSIC_ICONS_LABEL_KEY);

	return (
		<>
			<div className="p-1.5 hairline-b border-border">
				<Input
					type="search"
					value={query}
					autoFocus
					onChange={(event) => setQuery(event.target.value)}
					placeholder={t('settings.taskProperties.ICON_SEARCH')}
					aria-label={t('settings.taskProperties.ICON_SEARCH')}
					className="h-8"
				/>
			</div>
			<div className="max-h-72 overflow-y-auto overscroll-contain py-1">
				{libraryGroups.map(({ category, items }) => {
					const groupLabel = t(ICON_CATEGORY_LABEL_KEYS[category]);
					return (
						<fieldset key={category} aria-label={groupLabel} className="min-w-0">
							<p className={GROUP_LABEL}>{groupLabel}</p>
							<div className={ICON_GRID}>
								{items.map((item) => {
									const name = item.key.split('-').join(' ');
									return (
										<button
											key={item.key}
											type="button"
											title={name}
											aria-label={name}
											aria-pressed={item.key === currentLibraryKey}
											onClick={() => onPick(libraryIconValue(item.key))}
											className={ICON_CELL}
										>
											<LibraryIcon iconKey={item.key} className="size-4" />
										</button>
									);
								})}
							</div>
						</fieldset>
					);
				})}
				{visibleClassicOptions.length > 0 && (
					<fieldset aria-label={classicLabel} className="min-w-0">
						<p className={GROUP_LABEL}>{classicLabel}</p>
						<div className={ICON_GRID}>
							{visibleClassicOptions.map((option) => {
								// Named with its property: `in progress` is also a library icon, `medium` a size and a priority
								const name = `${iconOptionLabel(option)} (${t(CLASSIC_ICON_GROUP_LABEL_KEYS[option.group])})`;
								const glyph = classicIconGlyphOf(option.path);
								return (
									<button
										key={option.path}
										type="button"
										title={name}
										aria-label={name}
										aria-pressed={option.path === value}
										onClick={() => onPick(option.path)}
										className={ICON_CELL}
									>
										{/* Drawn as the glyph the property will show, with no file to load */}
										<TaskPropertyIcon
											kind={glyph?.kind ?? kind}
											name={glyph?.name ?? option.name}
										/>
									</button>
								);
							})}
						</div>
					</fieldset>
				)}
				{!hasResults && (
					<p className="px-2 py-3 text-xs text-muted-foreground">{t('settings.taskProperties.ICON_EMPTY')}</p>
				)}
			</div>
		</>
	);
}
