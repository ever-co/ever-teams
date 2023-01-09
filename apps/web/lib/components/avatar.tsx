import { clsxm } from '@app/utils';
import Image from 'next/legacy/image';
import { PropsWithChildren } from 'react';

type Props = {
	className?: string;
	size: number;
	imageUrl?: string;
	shape?: 'circle' | 'square';
	alt?: string;
} & PropsWithChildren;
export function Avatar({
	className,
	imageUrl,
	size,
	shape = 'circle',
	children,
	alt,
}: Props) {
	return (
		<div
			className={clsxm(
				'bg-slate-400 relative',
				shape === 'circle' && ['rounded-full'],
				shape === 'square' && ['rounded-md'],
				className
			)}
			style={{ width: size, height: size }}
		>
			{imageUrl && (
				<Image
					layout="fill"
					src={imageUrl}
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
