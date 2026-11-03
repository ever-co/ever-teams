'use client';

import { memo, useMemo, type CSSProperties, type ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useParentSize } from '@visx/responsive';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/core/components/common/tooltip';
import { MoreHorizontal } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort, formatPercent } from '@/core/lib/utils/dashboard-figures';
import {
	mosaicTilesOf,
	squarify,
	type MosaicDensity,
	type MosaicItem,
	type MosaicRect,
	type MosaicTile
} from '@/core/lib/utils/dashboards/apps-urls';
import { AppTile } from './usage-cells';

/** The mosaic keeps one height whatever the period, so the list under it never jumps. */
const MOSAIC_FRAME = 'relative h-80 md:h-88';

const TILE_BASE =
	'absolute flex min-w-0 overflow-hidden rounded-lg text-left outline-none hairline-ring transition-[opacity,background-color,box-shadow] duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/40';

/** The three longest apps and sites carry the three tones of the split bar, at a tint that keeps text readable. */
const LEADING_TILE_TONES = [
	'bg-primary/[0.16] ring-primary/25 hover:bg-primary/[0.21]',
	'bg-primary/[0.10] ring-primary/20 hover:bg-primary/[0.14]',
	'bg-primary/[0.05] ring-primary/15 hover:bg-primary/[0.08]'
];

const PLAIN_TILE_TONE = 'bg-foreground/[0.03] ring-foreground/10 hover:bg-foreground/[0.06]';

const OTHERS_TILE_TONE = 'bg-foreground/[0.06] ring-foreground/15 hover:bg-foreground/[0.09]';

const PICKED_TILE = 'ring-primary/45 shadow-sm shadow-primary/10';

const DIMMED_TILE = 'opacity-50 hover:opacity-80';

const DENSITY_LAYOUTS: Record<MosaicDensity, string> = {
	hero: 'flex-col justify-between gap-2 p-3',
	full: 'flex-col justify-between gap-1.5 p-2.5',
	label: 'items-start gap-2 p-2',
	mark: 'items-center justify-center',
	bare: ''
};

const TOOLTIP_DENSITIES = new Set<MosaicDensity>(['label', 'mark', 'bare']);

const SECONDARY_TEXT = 'text-xs tabular-nums text-foreground/70';

function toneOf(item: MosaicItem) {
	if (item.isOthers) {
		return OTHERS_TILE_TONE;
	}
	return LEADING_TILE_TONES[item.rank] ?? PLAIN_TILE_TONE;
}

function pickStateOf(item: MosaicItem, pickedKey: string | null) {
	if (!pickedKey) {
		return undefined;
	}
	if (item.key === pickedKey) {
		return PICKED_TILE;
	}
	return DIMMED_TILE;
}

function pixelRectStyle(rect: MosaicRect): CSSProperties {
	return { left: rect.x, top: rect.y, width: rect.width, height: rect.height };
}

interface TileLabels {
	untitled: string;
	othersOf: (count: number) => string;
}

function tileNameOf(item: MosaicItem, labels: TileLabels) {
	if (item.isOthers) {
		return labels.othersOf(item.titles.length);
	}
	if (item.title) {
		return item.title;
	}
	return labels.untitled;
}

function TileMark({ item }: Readonly<{ item: MosaicItem }>) {
	if (item.isOthers) {
		return (
			<span
				aria-hidden="true"
				className="keycap-3d inline-flex size-5 shrink-0 items-center justify-center rounded-[6px] text-muted-foreground"
			>
				<MoreHorizontal className="size-3.5" />
			</span>
		);
	}
	return <AppTile title={item.title} />;
}

function TileContent({
	item,
	density,
	name,
	duration,
	share
}: Readonly<{ item: MosaicItem; density: MosaicDensity; name: string; duration: string; share: string }>) {
	switch (density) {
		case 'hero':
			return (
				<>
					<span className="flex items-start justify-between gap-2">
						<TileMark item={item} />
						<span className={SECONDARY_TEXT}>{share}</span>
					</span>
					<span className="flex min-w-0 flex-col gap-0.5">
						<span className="line-clamp-2 text-[13px] font-medium text-foreground">{name}</span>
						<span className="text-lg font-semibold tabular-nums text-foreground">{duration}</span>
					</span>
				</>
			);
		case 'full':
			return (
				<>
					<span className="flex items-start justify-between gap-2">
						<TileMark item={item} />
						<span className={SECONDARY_TEXT}>{share}</span>
					</span>
					<span className="flex min-w-0 flex-col">
						<span className="truncate text-[13px] font-medium text-foreground">{name}</span>
						<span className={SECONDARY_TEXT}>{duration}</span>
					</span>
				</>
			);
		case 'label':
			return (
				<>
					<TileMark item={item} />
					<span className="min-w-0 truncate pt-0.5 text-xs font-medium text-foreground">{name}</span>
				</>
			);
		case 'mark':
			return <TileMark item={item} />;
		case 'bare':
			return null;
	}
}

const MosaicTileButton = memo(function MosaicTileButton({
	tile,
	pickedKey,
	onPick,
	labels
}: Readonly<{
	tile: MosaicTile;
	pickedKey: string | null;
	onPick: (key: string) => void;
	labels: TileLabels;
}>) {
	const t = useTranslations();
	const locale = useLocale();
	const { item, rect, density } = tile;
	const name = tileNameOf(item, labels);
	const duration = formatDurationShort(item.seconds);
	const share = formatPercent(item.share, locale);
	const label = t('dashboard.appsUrls.MOSAIC_TILE_LABEL', { name, duration, share });
	const isPicked = pickedKey === item.key;
	const className = cn(TILE_BASE, DENSITY_LAYOUTS[density], toneOf(item), pickStateOf(item, pickedKey));
	const style = pixelRectStyle(rect);
	const handleClick = () => onPick(item.key);
	const content = <TileContent item={item} density={density} name={name} duration={duration} share={share} />;
	const needsTooltip = TOOLTIP_DENSITIES.has(density);

	if (!needsTooltip) {
		return (
			<button
				type="button"
				aria-pressed={isPicked}
				aria-label={label}
				onClick={handleClick}
				className={className}
				style={style}
			>
				{content}
			</button>
		);
	}
	return (
		<Tooltip>
			<TooltipTrigger
				type="button"
				aria-pressed={isPicked}
				aria-label={label}
				onClick={handleClick}
				className={className}
				style={style}
			>
				{content}
			</TooltipTrigger>
			<TooltipContent side="top">{label}</TooltipContent>
		</Tooltip>
	);
});

/** Tiles are buttons in reading order; the picked one again gives the whole period back to the list. */
export const AppsUrlsMosaic = memo(function AppsUrlsMosaic({
	items,
	pickedKey,
	onPick
}: Readonly<{
	items: ReadonlyArray<MosaicItem>;
	pickedKey: string | null;
	onPick: (key: string) => void;
}>) {
	const t = useTranslations();
	const { parentRef, width, height } = useParentSize<HTMLDivElement>({ debounceTime: 50 });
	const tiles = useMemo(() => mosaicTilesOf(items, width, height), [height, items, width]);
	const labels = useMemo<TileLabels>(
		() => ({
			untitled: t('dashboard.appsUrls.UNTITLED'),
			othersOf: (count: number) => t('dashboard.appsUrls.OTHER_TITLES', { count })
		}),
		[t]
	);
	const hasWidth = width > 0;
	const hasHeight = height > 0;
	const isMeasured = hasWidth && hasHeight;

	return (
		<div className="p-1.5">
			<div
				ref={parentRef}
				role="group"
				aria-label={t('dashboard.appsUrls.MOSAIC_LABEL')}
				className={MOSAIC_FRAME}
			>
				{isMeasured &&
					tiles.map((tile) => (
						<MosaicTileButton
							key={tile.item.key}
							tile={tile}
							pickedKey={pickedKey}
							onPick={onPick}
							labels={labels}
						/>
					))}
			</div>
		</div>
	);
});

/** A fixed mosaic for the skeleton and the empty period: the frame keeps its shape before and without data. */
const PLACEHOLDER_VALUES = [30, 18, 13, 10, 8, 7, 6, 5, 3];

const PLACEHOLDER_BOX: MosaicRect = { x: 0, y: 0, width: 1000, height: 380 };

const PLACEHOLDER_RECTS = squarify(PLACEHOLDER_VALUES, PLACEHOLDER_BOX);

function percentOfBox(value: number, size: number) {
	return (value / size) * 100;
}

function placeholderStyleOf(rect: MosaicRect): CSSProperties {
	const left = percentOfBox(rect.x, PLACEHOLDER_BOX.width);
	const top = percentOfBox(rect.y, PLACEHOLDER_BOX.height);
	const width = percentOfBox(rect.width, PLACEHOLDER_BOX.width);
	const height = percentOfBox(rect.height, PLACEHOLDER_BOX.height);
	return {
		left: `calc(${left}% + 2px)`,
		top: `calc(${top}% + 2px)`,
		width: `calc(${width}% - 4px)`,
		height: `calc(${height}% - 4px)`
	};
}

function PlaceholderTiles({ tileClassName }: Readonly<{ tileClassName: string }>) {
	return (
		<>
			{PLACEHOLDER_RECTS.map((rect, index) => (
				<span
					key={index}
					aria-hidden="true"
					className={cn('absolute rounded-lg', tileClassName)}
					style={placeholderStyleOf(rect)}
				/>
			))}
		</>
	);
}

export function AppsUrlsMosaicSkeleton() {
	return (
		<div className="p-1.5" aria-hidden="true">
			<div className={MOSAIC_FRAME}>
				<PlaceholderTiles tileClassName="animate-pulse bg-foreground/[0.05]" />
			</div>
		</div>
	);
}

/** An empty period or a failed read keeps the mosaic's frame as faint ghost tiles, with its message over them. */
export function AppsUrlsMosaicMessage({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<div className="p-1.5">
			<div className={MOSAIC_FRAME}>
				<PlaceholderTiles tileClassName="bg-foreground/[0.025]" />
				<div className="absolute inset-0 flex items-center justify-center p-4">{children}</div>
			</div>
		</div>
	);
}
