'use client';

import { useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { cn } from '@/core/lib/helpers';
import { publicAssetUrl } from '@/core/lib/helpers/public-asset-url';
import {
	gauzyDiskIconKeyOf,
	isClassicIcon,
	isIconUrl,
	isUploadedIcon,
	libraryIconKeyOf
} from '@/core/lib/utils/property-icon-value';
import { uploadedIconPreviewOf } from '@/core/lib/utils/uploaded-icon-preview';

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

/**
 * Where the browser loads an icon image from, or null when there is none to load. An uploaded image Gauzy keeps on
 * its own disk goes through this app, as its other files do; one held by S3, Wasabi, DigitalOcean or Cloudinary loads
 * from `url`, the `fullIconUrl` Gauzy built with that provider; one not saved yet shows the file the user picked.
 */
export function propertyIconSourceOf(value: string, url?: string | null): string | null {
	if (!isUploadedIcon(value)) {
		return propertyIconFileUrl(value);
	}
	const diskKey = gauzyDiskIconKeyOf(value);
	if (diskKey) {
		return propertyIconFileUrl(diskKey);
	}
	const preview = uploadedIconPreviewOf(value);
	if (preview) {
		return preview;
	}
	if (url && isIconUrl(url)) {
		return url.trim();
	}
	return null;
}

interface PropertyIconImageProps {
	/** The stored `icon` of the property, see `property-icon-value.ts`. */
	value: string;
	/** The property's `fullIconUrl`: where an uploaded image held outside Gauzy loads from. */
	url?: string | null;
	className?: string;
	/** Shown in place of an icon file that fails to load, or of a library icon this version does not know. */
	fallback?: ReactNode;
}

/**
 * A property icon as stored. A library icon is drawn with the app's stroke. An icon file is drawn as an image, so the
 * SVG markup Gauzy serves never enters the page and needs no sanitizing, and the fallback replaces it if it fails.
 */
export function PropertyIconImage({ value, url, className, fallback = null }: Readonly<PropertyIconImageProps>) {
	const [failedSource, setFailedSource] = useState<string | null>(null);
	const libraryKey = libraryIconKeyOf(value);

	if (libraryKey) {
		return <LibraryIcon iconKey={libraryKey} fallback={fallback} className={cn('size-4 shrink-0', className)} />;
	}
	// A failed source is not retried; a new one (a URL signed again, another upload) is
	const source = value.trim() ? propertyIconSourceOf(value, url) : null;
	if (!source || failedSource === source) {
		return <>{fallback}</>;
	}
	return (
		<Image
			src={source}
			alt=""
			width={16}
			height={16}
			unoptimized
			onError={() => setFailedSource(source)}
			className={cn(
				'size-4 shrink-0',
				// Classic icons are black line drawings; an image of the user's own keeps its colors and proportions
				isClassicIcon(value) && 'dark:invert',
				isUploadedIcon(value) && 'object-contain',
				className
			)}
		/>
	);
}
