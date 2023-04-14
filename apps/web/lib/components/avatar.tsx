import { avatarState } from '@app/stores';
import { clsxm } from '@app/utils';
import Image from 'next/legacy/image';
import { PropsWithChildren, useMemo } from 'react';
import { useRecoilState } from 'recoil';

type Props = {
	className?: string;
	size: number;
	imageUrl?: string;
	shape?: 'circle' | 'square';
	alt?: string;
	imageTitle?: string;
} & PropsWithChildren;

export function Avatar({
	className,
	imageUrl,
	size,
	shape = 'circle',
	children,
	alt,
	imageTitle,
}: Props) {
	const [avatar, setAvatar] = useRecoilState(avatarState);

	const imagePathName =
		imageUrl && typeof imageUrl === 'string' ? new URL(imageUrl).pathname : '';
	const avatarPresent = Object.hasOwn(avatar, imagePathName);

	const imgUrl = useMemo(() => {
		if (avatarPresent) {
			return avatar[imagePathName];
		} else {
			setAvatar({ ...avatar, [imagePathName]: imageUrl });
			return imageUrl;
		}
		/* eslint-disable react-hooks/exhaustive-deps */
	}, [imagePathName, avatarPresent]);

	return (
		<div
			className={clsxm(
				'bg-slate-400 relative',
				shape === 'circle' && ['rounded-full'],
				shape === 'square' && ['rounded-md'],
				imageTitle && !imgUrl && ['flex justify-center items-center'],
				className
			)}
			style={{ width: size, height: size }}
		>
			{imageTitle && !imgUrl && (
				<span className="uppercase font-normal text-lg">
					{(imageTitle || '')[0] || ''}
				</span>
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
				/>
			)}
			{children}
		</div>
	);
}
