'use client';

import { memo, useState } from 'react';
import { Desktop, Globe } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import {
	activityBrandOf,
	activityHostOf,
	type ActivitySubject,
	faviconPathOf,
	faviconsEnabled,
	isFaviconHost
} from '@/core/lib/utils/activity-icons';
import { BRAND_ICONS } from './activity-brand-icons';

type IconSize = 'sm' | 'md';

const TILE = 'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[6px]';
const TILE_SIZE: Readonly<Record<IconSize, string>> = { sm: 'size-5', md: 'size-6' };
const GLYPH_SIZE: Readonly<Record<IconSize, string>> = { sm: 'size-3', md: 'size-3.5' };
const IMAGE_SIZE: Readonly<Record<IconSize, number>> = { sm: 14, md: 16 };

/** A light tile in both themes: brand colours and favicons are drawn for a light background. */
const MARK_TILE = 'bg-white hairline-ring ring-black/10 dark:ring-white/15';

/** Hosts whose favicon failed in this tab: asked once, then the generic icon. */
const failedHosts = new Set<string>();

interface ActivityIconProps extends ActivitySubject {
	size?: IconSize;
	className?: string;
}

function GenericIcon({ isSite, size, className }: Readonly<{ isSite: boolean; size: IconSize; className?: string }>) {
	const Glyph = isSite ? Globe : Desktop;
	return (
		<span aria-hidden="true" className={cn(TILE, TILE_SIZE[size], 'keycap-3d text-muted-foreground', className)}>
			<Glyph className={GLYPH_SIZE[size]} />
		</span>
	);
}

function FaviconIcon({ host, size, className }: Readonly<{ host: string; size: IconSize; className?: string }>) {
	const [hasFailed, setHasFailed] = useState(() => failedHosts.has(host));
	if (hasFailed) {
		return <GenericIcon isSite size={size} className={className} />;
	}
	const fail = () => {
		failedHosts.add(host);
		setHasFailed(true);
	};
	return (
		<span aria-hidden="true" className={cn(TILE, TILE_SIZE[size], MARK_TILE, className)}>
			{/* A plain img: the favicon route is same-origin, and next/image's hosts are fixed at build time */}
			<img
				src={faviconPathOf(host)}
				alt=""
				width={IMAGE_SIZE[size]}
				height={IMAGE_SIZE[size]}
				loading="lazy"
				decoding="async"
				onError={fail}
				className="object-contain"
			/>
		</span>
	);
}

/**
 * The icon of a tracked app or visited site (#5023): the mark and colour of a common one, bundled; else, where the
 * deployment allows it, the site's favicon through the app's own route; else a generic globe for a site or a
 * screen for an app. Never a broken image: a favicon that fails gives way to the generic icon.
 */
export const ActivityIcon = memo(function ActivityIcon({
	title,
	kind,
	url,
	size = 'sm',
	className
}: Readonly<ActivityIconProps>) {
	const subject = { title, kind, url };
	const brand = activityBrandOf(subject);
	if (brand) {
		const Mark = BRAND_ICONS[brand.key];
		return (
			<span aria-hidden="true" className={cn(TILE, TILE_SIZE[size], MARK_TILE, className)}>
				<Mark className={GLYPH_SIZE[size]} style={{ color: brand.color }} />
			</span>
		);
	}
	const host = activityHostOf(subject);
	const isSite = kind === 'url' || (kind == null && host !== null);
	const fetchesFavicon = host !== null && isFaviconHost(host) && faviconsEnabled();
	if (fetchesFavicon) {
		return <FaviconIcon key={host} host={host} size={size} className={className} />;
	}
	return <GenericIcon isSite={isSite} size={size} className={className} />;
});
