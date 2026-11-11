'use client';

import { useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { cn } from '@/core/lib/helpers';
import { publicAssetUrl } from '@/core/lib/helpers/public-asset-url';
import { isClassicIcon, isIconUrl, libraryIconKeyOf } from '@/core/lib/utils/property-icon-value';

// The catalog loads with the first library icon on screen, never with the page
const LibraryIcon = dynamic(
	() => import('@/core/components/icons/property-icon-catalog').then((module) => module.LibraryIcon),
	{ ssr: false, loading: () => <span className="inline-block size-4 shrink-0" aria-hidden="true" /> }
);

/**
 * Where the browser loads an icon file from: an absolute URL as it is, a Gauzy path through this app's own
 * `/api/public-assets` route. The app's origin keeps the icon loading when the API is on another site (Gauzy sends
 * `Cross-Origin-Resource-Policy: same-site`), behind plain HTTP, or outside the page's image sources.
 */
export function propertyIconFileUrl(value: string): string {
	const text = value.trim();
	return isIconUrl(text) ? text : publicAssetUrl(text, '');
}

interface PropertyIconImageProps {
	/** The stored `icon` of the property, see `property-icon-value.ts`. */
	value: string;
	className?: string;
	/** Shown in place of an icon file that fails to load, or of a library icon this version does not know. */
	fallback?: ReactNode;
}

/**
 * A property icon as stored. A library icon is drawn with the app's stroke. An icon file is drawn as an image, so the
 * SVG markup Gauzy serves never enters the page and needs no sanitizing, and the fallback replaces it if it fails.
 */
export function PropertyIconImage({ value, className, fallback = null }: Readonly<PropertyIconImageProps>) {
	const [failedValue, setFailedValue] = useState<string | null>(null);
	const libraryKey = libraryIconKeyOf(value);

	if (libraryKey) {
		return <LibraryIcon iconKey={libraryKey} fallback={fallback} className={cn('size-4 shrink-0', className)} />;
	}
	if (!value.trim() || failedValue === value) {
		return <>{fallback}</>;
	}
	return (
		<Image
			src={propertyIconFileUrl(value)}
			alt=""
			width={16}
			height={16}
			unoptimized
			onError={() => setFailedValue(value)}
			// Classic icons are black line drawings; an image of the user's own keeps its colors
			className={cn('size-4 shrink-0', isClassicIcon(value) && 'dark:invert', className)}
		/>
	);
}
