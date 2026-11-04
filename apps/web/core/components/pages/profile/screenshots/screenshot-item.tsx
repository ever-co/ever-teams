'use client';

import { useCallback, useMemo, useState } from 'react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { useModal } from '@/core/hooks';
import { useTimeSlots } from '@/core/hooks/activities/use-time-slots';
import { IScreenShootItem } from '@/core/types/interfaces/timer/screenshoot/screenshoot';
import {
	APP_DIALOG_BODY,
	APP_DIALOG_FOOTER,
	AppDialog,
	AppDialogDescription
} from '@/core/components/common/app-dialog';
import { Button } from '@/core/components/common/button';
import { DialogTitle } from '@/core/components/common/dialog';
import { HueIconTile } from '@/core/components/common/value-glyphs';
import { ActivityFigure } from '@/core/components/dashboards/kit/meters';
import { ExternalLink, Image as ImageGlyph, Trash } from '@/core/components/icons';
import { webAddressOf } from '@/core/components/activities/activity-links';
import { cn } from '@/core/lib/helpers';
import {
	canDeleteSlotWith,
	type ScreenshotSlotActions,
	slotRangeTextOf,
	useScreenshotSlotActions
} from './screenshot-slots';

type ScreenshotItemProps = IScreenShootItem & {
	/** How many screenshots the slot holds; the badge shows from two. */
	screenshotCount?: number;
	/** The full-size image "View" opens; the thumbnail is used when the slot has none. */
	fullImageUrl?: string;
	/** Read once by the view that lists the tiles; a tile rendered on its own reads them itself. */
	slotActions?: ScreenshotSlotActions;
};

export const SHOT_FRAME = 'relative block aspect-[16/10] w-full overflow-hidden rounded-md';

export const QUIET_SHOT_FRAME =
	'flex items-center justify-center hairline-border border-dashed border-foreground/20 px-2 text-center text-xs text-muted-foreground';

const IMAGE_SHOT_FRAME =
	'bg-foreground/5 hairline-ring ring-foreground/10 transition-shadow group-hover/thumb:ring-foreground/25';

const THUMB_BUTTON =
	'group/thumb block w-full rounded-md text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25';

const TIME_OPTIONS: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };

function percentNumberOf(value: number | string) {
	const parsed = Number(value);
	if (Number.isFinite(parsed)) {
		return parsed;
	}
	return 0;
}

/** The thumbnail of a slot on its media frame, the count at its corner; a slot without image says so. */
export function SlotThumbnail({
	imageUrl,
	alt,
	count = 0
}: Readonly<{ imageUrl: string; alt: string; count?: number }>) {
	const t = useTranslations();
	const [failedUrl, setFailedUrl] = useState<string | null>(null);
	const hasImage = imageUrl.length > 0;
	const hasFailed = failedUrl === imageUrl;
	const hasSeveral = count > 1;
	if (!hasImage) {
		return <span className={cn(SHOT_FRAME, QUIET_SHOT_FRAME)}>{t('profile.activity.NO_SCREENSHOT')}</span>;
	}
	return (
		<span className={cn(SHOT_FRAME, IMAGE_SHOT_FRAME)}>
			{!hasFailed && (
				<Image
					src={imageUrl}
					alt={alt}
					width={320}
					height={200}
					className="size-full object-cover"
					onError={() => setFailedUrl(imageUrl)}
				/>
			)}
			{hasFailed && (
				<span className="flex size-full items-center justify-center text-muted-foreground">
					<ImageGlyph aria-hidden="true" className="size-5" />
				</span>
			)}
			{hasSeveral && (
				<span
					aria-hidden="true"
					className="absolute right-1.5 bottom-1.5 rounded-sm bg-foreground/70 px-1 text-[11px] font-medium tabular-nums text-background"
				>
					{count}
				</span>
			)}
		</span>
	);
}

function DeleteSlotButton({
	idSlot,
	rangeText,
	deleteTimeSlots
}: Readonly<{ idSlot: string; rangeText: string; deleteTimeSlots: ScreenshotSlotActions['deleteTimeSlots'] }>) {
	const t = useTranslations();
	const { isOpen, openModal, closeModal } = useModal();
	const [isDeleting, setIsDeleting] = useState(false);

	const confirmDelete = useCallback(async () => {
		setIsDeleting(true);
		await deleteTimeSlots([idSlot]);
		setIsDeleting(false);
		closeModal();
	}, [closeModal, deleteTimeSlots, idSlot]);

	return (
		<>
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				onClick={openModal}
				aria-label={t('profile.activity.DELETE_SLOT')}
				className="ml-auto text-muted-foreground hover:text-destructive-ink"
			>
				<Trash aria-hidden="true" className="size-4" />
			</Button>
			<AppDialog open={isOpen} onClose={closeModal} width="sm" keepOpenOnOutsideClick dismissible={!isDeleting}>
				<div className={cn(APP_DIALOG_BODY, 'flex flex-col items-start py-5')}>
					<HueIconTile hue="destructive" className="size-9 rounded-[10px] [&_svg]:size-4.5">
						<Trash />
					</HueIconTile>
					<DialogTitle className="mt-3 text-[15px] font-semibold text-balance text-foreground">
						{t('timeSlot.DELETE_MESSAGE')}
					</DialogTitle>
					<AppDialogDescription className="mt-1 text-[13px] tabular-nums text-muted-foreground">
						{rangeText}
					</AppDialogDescription>
				</div>
				<div className={APP_DIALOG_FOOTER}>
					<Button
						type="button"
						variant="ghost"
						size="default"
						onClick={closeModal}
						disabled={isDeleting}
						data-initial-focus=""
						className="ml-auto"
					>
						{t('common.CANCEL')}
					</Button>
					<Button
						type="button"
						variant="danger"
						size="default"
						onClick={confirmDelete}
						loading={isDeleting}
						disabled={isDeleting}
					>
						{t('common.DELETE')}
					</Button>
				</div>
			</AppDialog>
		</>
	);
}

/**
 * One slot of a day (good-not-bad-timeline's slot row): the thumbnail on its media frame, the time range, the
 * activity with its five ticks, then View info, View (the full image in a new tab) and Delete under the rule of
 * `useTimeSlots`.
 */
function ScreenshotTile({
	idSlot,
	startTime,
	endTime,
	imageUrl,
	percent,
	showProgress = true,
	viewMode = 'default',
	onShow,
	ownerEmployeeId,
	screenshotCount = 0,
	fullImageUrl,
	slotActions
}: Readonly<ScreenshotItemProps & { slotActions: ScreenshotSlotActions }>) {
	const t = useTranslations();
	const locale = useLocale();
	const timeFormat = useMemo(() => new Intl.DateTimeFormat(locale, TIME_OPTIONS), [locale]);
	const rangeText = slotRangeTextOf(timeFormat, startTime, endTime);
	const startText = slotRangeTextOf(timeFormat, startTime);
	const alt = t('profile.activity.SCREENSHOT_ALT', { time: startText });
	const thumbnail = <SlotThumbnail imageUrl={imageUrl} alt={alt} count={screenshotCount} />;
	if (viewMode === 'screenShot-only') {
		return thumbnail;
	}
	const canDelete = canDeleteSlotWith(slotActions, ownerEmployeeId);
	const viewSource = fullImageUrl || imageUrl;
	const viewUrl = webAddressOf(viewSource);
	const percentNumber = percentNumberOf(percent);
	return (
		<div className="flex min-w-0 flex-col gap-1.5">
			<button
				type="button"
				onClick={onShow}
				aria-label={t('profile.activity.SLOT_INFO', { range: rangeText })}
				className={THUMB_BUTTON}
			>
				{thumbnail}
			</button>
			<div className="flex min-h-5 items-center justify-between gap-2">
				<span className="truncate text-xs tabular-nums text-muted-foreground">{rangeText}</span>
				{showProgress && <ActivityFigure percent={percentNumber} />}
			</div>
			<div className="-ml-2 flex min-w-0 items-center gap-0.5">
				<Button type="button" variant="ghost" size="sm" onClick={onShow} className="text-muted-foreground">
					{t('common.VIEW_INFO')}
				</Button>
				{viewUrl && (
					<Button asChild variant="ghost" size="sm" className="text-muted-foreground">
						<a
							href={viewUrl}
							target="_blank"
							rel="noopener noreferrer"
							aria-label={t('profile.activity.VIEW_FULL')}
						>
							{t('common.VIEW')}
							<ExternalLink aria-hidden="true" className="size-3.5" />
						</a>
					</Button>
				)}
				{canDelete && (
					<DeleteSlotButton
						idSlot={idSlot}
						rangeText={rangeText}
						deleteTimeSlots={slotActions.deleteTimeSlots}
					/>
				)}
			</div>
		</div>
	);
}

function ScreenshotTileWithOwnSlots(props: Readonly<ScreenshotItemProps>) {
	const timeSlots = useTimeSlots();
	const slotActions = useScreenshotSlotActions(timeSlots);
	return <ScreenshotTile {...props} slotActions={slotActions} />;
}

const ScreenshotItem = (props: ScreenshotItemProps) => {
	if (props.slotActions) {
		return <ScreenshotTile {...props} slotActions={props.slotActions} />;
	}
	return <ScreenshotTileWithOwnSlots {...props} />;
};

export default ScreenshotItem;
