'use client';

/* eslint-disable no-mixed-spaces-and-tabs */
import { avatarState } from '@app/stores';
import { clsxm, isValidUrl } from '@app/utils';
import Image from 'next/legacy/image';
import { PropsWithChildren, useEffect, useMemo } from 'react';
import { useRecoilState } from 'recoil';
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
	const [avatar, setAvatar] = useRecoilState(avatarState);

	const imagePathName = imageUrl && isValidUrl(imageUrl) ? new URL(imageUrl).pathname : '';

	const avatarPresent = hasOwn(avatar, imagePathName);

	const imgUrl = useMemo(() => {
		if (avatarPresent) {
			return avatar[imagePathName];
		} else {
			return imageUrl;
		}
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
			{imageTitle && !imgUrl && <span className="uppercase font-normal text-lg">{imageTitle[0] || ''}</span>}

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
				/>
			)}
			{children}
		</div>
	);
}
