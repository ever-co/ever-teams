import Image from 'next/image';
import { publicAssetUrl } from '@/core/lib/helpers/public-asset-url';
import { cn } from '@/core/lib/helpers';

/** Drawn as an image so the SVG markup Gauzy serves never enters the page and needs no sanitizing. */
export function PropertyIconImage({ path, className }: Readonly<{ path: string; className?: string }>) {
	return (
		<Image
			src={publicAssetUrl(path)}
			alt=""
			width={16}
			height={16}
			unoptimized
			className={cn('size-4 shrink-0 dark:invert', className)}
		/>
	);
}
