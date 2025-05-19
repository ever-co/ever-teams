'use client';

/* eslint-disable no-mixed-spaces-and-tabs */
import { avatarState } from '@/core/stores';
import { clsxm, isValidUrl } from '@/core/lib/utils';
import Image from 'next/legacy/image';
import { PropsWithChildren, useEffect, useMemo, useState } from 'react';
import { useAtom } from 'jotai';
import hasOwn from 'lodash/has';

type Props = {
	className?: string;
	size: number;
	imageUrl?: string;
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
	const [hasError, setHasError] = useState(false);

	const imagePathName = imageUrl && isValidUrl(imageUrl) ? new URL(imageUrl).pathname : '';

	const avatarPresent = hasOwn(avatar, imagePathName);

	const imgUrl = useMemo(() => {
		if (hasError) return null;
		if (avatarPresent) {
			return avatar[imagePathName];
		} else {
			return imageUrl;
		}
	}, [imagePathName, avatarPresent, hasError, imageUrl]);

	useEffect(() => {
		if (imageUrl && !hasError) {
			setAvatar((avatar: any) => ({ ...avatar, [imagePathName]: imageUrl }));
		}
	}, [imageUrl, imagePathName, hasError]);

	const handleImageError = () => {
		setHasError(true);
		// Remove the failed URL from cache
		setAvatar((avatar: any) => {
			const newAvatar = { ...avatar };
			delete newAvatar[imagePathName];
			return newAvatar;
		});
	};

	return (
		<div
			className={clsxm(
				'bg-slate-400 relative',
				shape === 'circle' && ['rounded-full'],
				shape === 'square' && ['rounded-md'],
				(imageTitle || hasError) && !imgUrl && ['flex justify-center items-center'],
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
			{(imageTitle || hasError) && !imgUrl && (
				<span className="uppercase font-normal text-lg">{imageTitle?.[0] || alt?.[0] || ''}</span>
			)}

			{imgUrl && (
				<Image
					layout="fill"
					src={imgUrl}
					className={clsxm(
						'w-full h-full',
						shape === 'circle' && ['rounded-full'],
						shape === 'square' && ['rounded-md']
					)}
					alt={alt}
					objectFit="cover"
					onError={handleImageError}
					unoptimized={true} // Add this to bypass Next.js image optimization for external URLs
				/>
			)}
			{children}
		</div>
	);
}
