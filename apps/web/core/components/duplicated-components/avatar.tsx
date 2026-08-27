'use client';

/* eslint-disable no-mixed-spaces-and-tabs */
import { avatarState } from '@/core/stores';
import { clsxm, isValidUrl, normalizeImageUrl } from '@/core/lib/utils';
import Image from 'next/image';
import { PropsWithChildren, useEffect, useMemo } from 'react';
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
} & PropsWithChildren;

export function Avatar({
	className,
	imageUrl,
	size,
	shape = 'circle',
	children,
	alt,
	imageTitle,
	backgroundColor
}: Props) {
	const [avatar, setAvatar] = useAtom(avatarState);

	const imagePathName =
		imageUrl && isValidUrl(imageUrl) ? `${new URL(imageUrl).host}${new URL(imageUrl).pathname}` : '';

	const avatarPresent = hasOwn(avatar, imagePathName);

	const imgUrl = useMemo(() => {
		const raw = avatarPresent ? avatar[imagePathName] : imageUrl;

		// Normalised here so the fallback branch below and the <Image> `src` agree on one value: the
		// API can return a route-relative path (e.g. the seeded `assets/images/avatars/…`) which
		// Next.js would resolve against the current route and 404, and a whitespace-only value is
		// truthy while normalising to '' — which next/image rejects. See `normalizeImageUrl`.
		return normalizeImageUrl(raw) || undefined;
		/* eslint-disable react-hooks/exhaustive-deps */
	}, [imagePathName, avatarPresent]);

	useEffect(() => {
		setAvatar((avatar: any) => ({ ...avatar, [imagePathName]: imageUrl }));
	}, [imageUrl, imagePathName]);

	return (
		<div
			className={clsxm(
				'bg-slate-400 relative',
				shape === 'circle' && ['rounded-full'],
				shape === 'square' && ['rounded-md'],
				imageTitle && !imgUrl && ['flex justify-center items-center'],
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
			{imageTitle && !imgUrl && <span className="text-lg font-normal uppercase">{imageTitle[0] || ''}</span>}

			{imgUrl && (
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
				/>
			)}
			{children}
		</div>
	);
}
