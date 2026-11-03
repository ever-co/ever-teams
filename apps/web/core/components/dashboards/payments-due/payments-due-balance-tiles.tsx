'use client';

import { memo, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { DASHBOARD_SURFACE, SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import { formatOwed, type OwedColumn, type OwedFigures, type OwedTile } from '@/core/lib/utils/dashboards/payments-due';
import { OwedAmount } from './payments-due-amount';
import { MISSING_FIGURE } from './payments-due-cells';

type Translate = ReturnType<typeof useTranslations>;

/** Tiles keep the width of a balance card: one currency never stretches into a band across the page. */
const TILES_GRID = 'grid grid-cols-[repeat(auto-fill,minmax(min(100%,17rem),1fr))] gap-3';

const TILE = cn(DASHBOARD_SURFACE, 'flex flex-col');

const TILE_BODY = 'flex flex-col gap-1 px-4 pt-3';

const TILE_LABEL = 'text-xs text-muted-foreground';

const TILE_HINT = 'min-h-4 text-xs tabular-nums text-muted-foreground';

const TILE_AMOUNT = 'text-2xl font-semibold text-foreground';

const COLUMNS_STRIP = 'mt-3 flex h-9 items-end gap-[2px] px-4';

/** A day with a small amount still shows a visible column next to the largest day of the period. */
const MIN_COLUMN_SHARE = 6;

const SKELETON_COLUMNS = [34, 58, 46, 72, 28, 64, 52, 40, 80, 36, 60, 44, 70, 30];

function columnHeightOf(amount: number, maxAmount: number) {
	if (maxAmount <= 0) {
		return 0;
	}
	const share = (amount / maxAmount) * 100;
	return Math.max(share, MIN_COLUMN_SHARE);
}

function columnToneOf(column: OwedColumn) {
	if (column.isToday) {
		return 'bg-primary';
	}
	return 'bg-primary/50';
}

function columnDayOf(column: OwedColumn, isWeekly: boolean, dayFormat: Intl.DateTimeFormat, t: Translate) {
	const day = dayFormat.format(column.firstDay);
	if (isWeekly) {
		return t('dashboard.paymentsDue.tiles.WEEK_OF', { day });
	}
	return day;
}

const OwedColumnBar = memo(function OwedColumnBar({
	column,
	maxAmount,
	title
}: Readonly<{ column: OwedColumn; maxAmount: number; title: string }>) {
	if (column.isFuture) {
		return <span className="h-full flex-1" />;
	}
	const hasAmount = column.amount > 0;
	if (!hasAmount) {
		return (
			<span title={title} className="flex h-full flex-1 items-end">
				<span className="block h-px w-full bg-foreground/15" />
			</span>
		);
	}
	const height = `${columnHeightOf(column.amount, maxAmount)}%`;
	return (
		<span title={title} className="flex h-full flex-1 items-end">
			<span className={cn('block w-full rounded-t-[2px]', columnToneOf(column))} style={{ height }} />
		</span>
	);
});

function OwedColumns({ tile }: Readonly<{ tile: OwedTile }>) {
	const t = useTranslations();
	const locale = useLocale();
	const dayFormat = useMemo(
		() => new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'short', day: 'numeric' }),
		[locale]
	);
	const showsColumns = tile.columns.length > 1;
	if (!showsColumns) {
		return <TileBaseline />;
	}
	return (
		<div aria-hidden="true" className={COLUMNS_STRIP}>
			{tile.columns.map((column) => {
				const day = columnDayOf(column, tile.isWeekly, dayFormat, t);
				const amount = formatOwed(column.amount, tile.currency, locale);
				const title = `${day} · ${amount}`;
				return (
					<OwedColumnBar key={column.key} column={column} maxAmount={tile.maxColumnAmount} title={title} />
				);
			})}
		</div>
	);
}

function TileBaseline() {
	return (
		<div aria-hidden="true" className={COLUMNS_STRIP}>
			<span className="block h-px w-full bg-foreground/10" />
		</div>
	);
}

function owedLabelOf(currency: string | null, t: Translate) {
	if (currency) {
		return t('dashboard.paymentsDue.figures.OWED_IN', { currency });
	}
	return t('dashboard.paymentsDue.figures.OWED');
}

const BalanceTile = memo(function BalanceTile({ tile }: Readonly<{ tile: OwedTile }>) {
	const t = useTranslations();
	const duration = formatDurationShort(tile.seconds);
	const hint = t('dashboard.paymentsDue.figures.CURRENCY_HINT', { count: tile.memberCount, duration });
	return (
		<article aria-label={owedLabelOf(tile.currency, t)} className={TILE}>
			<div className={TILE_BODY}>
				<span className={TILE_LABEL}>{t('dashboard.paymentsDue.figures.OWED')}</span>
				<OwedAmount
					amount={tile.amount}
					currency={tile.currency}
					showsCode
					className={TILE_AMOUNT}
					codeClassName="text-[13px]"
				/>
				<span className={TILE_HINT}>{hint}</span>
			</div>
			<OwedColumns tile={tile} />
		</article>
	);
});

function notPricedHintOf(figures: OwedFigures, t: Translate) {
	const hasTime = figures.trackedSeconds > 0;
	if (!hasTime) {
		return null;
	}
	const duration = formatDurationShort(figures.trackedSeconds);
	return t('dashboard.paymentsDue.figures.NOT_PRICED', { duration });
}

/** No priced time: the frame stays, with a dash for the amount and the time that has no rate. */
function UnpricedTile({ figures }: Readonly<{ figures: OwedFigures }>) {
	const t = useTranslations();
	const hint = notPricedHintOf(figures, t);
	return (
		<article aria-label={t('dashboard.paymentsDue.figures.OWED')} className={TILE}>
			<div className={TILE_BODY}>
				<span className={TILE_LABEL}>{t('dashboard.paymentsDue.figures.OWED')}</span>
				<span className={cn(TILE_AMOUNT, 'text-muted-foreground')}>{MISSING_FIGURE}</span>
				<span className={TILE_HINT}>{hint}</span>
			</div>
			<TileBaseline />
		</article>
	);
}

function OwedNote() {
	const t = useTranslations();
	return <p className="px-1 text-xs text-muted-foreground text-pretty">{t('dashboard.paymentsDue.NOTE')}</p>;
}

function TileSkeleton() {
	return (
		<div className={TILE}>
			<div className={TILE_BODY}>
				<span className={cn('mt-1 h-2 w-12', SKELETON_BAR)} />
				<span className={cn('mt-2 h-5 w-36', SKELETON_BAR)} />
				<span className={cn('mt-2 h-2 w-28', SKELETON_BAR)} />
			</div>
			<div className={COLUMNS_STRIP}>
				{SKELETON_COLUMNS.map((height, index) => (
					<span
						key={index}
						className="block flex-1 animate-pulse rounded-t-[2px] bg-foreground/[0.05]"
						style={{ height: `${height}%` }}
					/>
				))}
			</div>
		</div>
	);
}

export function PaymentsDueBalanceTilesSkeleton() {
	const t = useTranslations();
	return (
		<section aria-label={t('dashboard.paymentsDue.tiles.LABEL')} aria-busy="true" className="flex flex-col gap-2">
			<div inert className={TILES_GRID}>
				<TileSkeleton />
				<TileSkeleton />
			</div>
			<OwedNote />
		</section>
	);
}

/** One balance per currency, never one sum across currencies; the note says nothing here is a payment. */
export function PaymentsDueBalanceTiles({
	tiles,
	figures,
	isLoading
}: Readonly<{ tiles: ReadonlyArray<OwedTile>; figures: OwedFigures | null; isLoading: boolean }>) {
	const t = useTranslations();
	if (isLoading) {
		return <PaymentsDueBalanceTilesSkeleton />;
	}
	if (!figures) {
		return <PaymentsDueBalanceTilesSkeleton />;
	}
	const hasTiles = tiles.length > 0;
	return (
		<section aria-label={t('dashboard.paymentsDue.tiles.LABEL')} className="flex flex-col gap-2">
			<div className={TILES_GRID}>
				{tiles.map((tile) => (
					<BalanceTile key={tile.key} tile={tile} />
				))}
				{!hasTiles && <UnpricedTile figures={figures} />}
			</div>
			<OwedNote />
		</section>
	);
}
