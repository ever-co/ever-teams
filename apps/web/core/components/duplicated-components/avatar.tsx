'use client';

/* eslint-disable no-mixed-spaces-and-tabs */
import { avatarState } from '@/core/stores';
import { clsxm, isValidUrl, normalizeImageUrl } from '@/core/lib/utils';
import Image from 'next/image';
import { PropsWithChildren, ReactNode, useEffect, useMemo, useState } from 'react';
import { useAtom } from 'jotai';
import hasOwn from 'lodash/has';

type Props = {
	className?: string;
	size: number;
	imageUrl?: string | null;
	shape?: 'circle' | 'square';
	alt?: string;
	imageTitle?: string;
	backgroundColor?: string;
	/** Shown while there is no image, or once it failed to load; the title's initial when none is given. */
	fallback?: ReactNode;
} & PropsWithChildren;

function fallbackOf(fallback: ReactNode, imageTitle: string | undefined): ReactNode {
	if (fallback) {
		return fallback;
	}
	if (imageTitle) {
		return <span className="text-lg font-normal uppercase">{imageTitle[0] || ''}</span>;
	}
	return null;
}

export function Avatar({
	className,
	imageUrl,
	size,
	shape = 'circle',
	children,
	alt,
	imageTitle,
	backgroundColor,
	fallback
}: Props) {
	const [avatar, setAvatar] = useAtom(avatarState);

	// One entry per object (host + path): the cache stays bounded however often a presigned URL is
	// re-signed, and the effect below refreshes the entry when the signature changes, so an expired
	// link is never reused.
	const imagePathName =
		imageUrl && isValidUrl(imageUrl) ? `${new URL(imageUrl).host}${new URL(imageUrl).pathname}` : '';

	const avatarPresent = hasOwn(avatar, imagePathName);
	const cachedUrl = avatarPresent ? avatar[imagePathName] : undefined;

	const imgUrl = useMemo(() => {
		const raw = cachedUrl ?? imageUrl;

		// Normalised here so the fallback branch below and the <Image> `src` agree on one value: the
		// API can return a route-relative path (e.g. the seeded `assets/images/avatars/…`) which
		// Next.js would resolve against the current route and 404, and a whitespace-only value is
		// truthy while normalising to '' — which next/image rejects. See `normalizeImageUrl`.
		return normalizeImageUrl(raw) || undefined;
		/* eslint-disable react-hooks/exhaustive-deps */
	}, [imagePathName, cachedUrl]);

	// An address that failed to load is not drawn again: the browser would show its broken-image icon and the alt text
	const [failedUrl, setFailedUrl] = useState<string>();
	const showsImage = Boolean(imgUrl) && failedUrl !== imgUrl;
	const fallbackContent = fallbackOf(fallback, imageTitle);
	const showsFallback = !showsImage && Boolean(fallbackContent);

	useEffect(() => {
		setAvatar((avatar: any) =>
			avatar[imagePathName] === imageUrl ? avatar : { ...avatar, [imagePathName]: imageUrl }
		);
	}, [imageUrl, imagePathName]);

	return (
		<div
			className={clsxm(
				'relative bg-foreground/5 hairline-ring ring-border',
				shape === 'circle' && ['rounded-full'],
				shape === 'square' && ['rounded-md'],
				showsFallback && ['flex justify-center items-center'],
				className
			)}
			style={{
				width: size,
				height: size,
				...(backgroundColor
					? {
							backgroundColor
						}
					: {})
			}}
		>
			{showsFallback && fallbackContent}

			{showsImage && imgUrl && (
				<Image
					fill
					sizes={`${size}px`}
					src={imgUrl}
					className={clsxm(
						'w-full h-full object-cover',
						shape === 'circle' && ['rounded-full'],
						shape === 'square' && ['rounded-md']
					)}
					alt={alt || 'Avatar'}
					onError={() => setFailedUrl(imgUrl)}
				/>
			)}
			{children}
		</div>
	);
}
