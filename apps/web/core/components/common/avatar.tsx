'use client';

import * as React from 'react';
import { Avatar as AvatarPrimitive } from '@base-ui/react/avatar';

import { cn } from '@/core/lib/helpers';
import { normalizeImageUrl } from '@/core/lib/utils/normalize-image-url';

/** Opaque fill: in an overlapping stack a translucent one lets the avatar underneath show through. */
const Avatar = React.forwardRef<HTMLSpanElement, AvatarPrimitive.Root.Props>(({ className, ...props }, ref) => (
	<AvatarPrimitive.Root
		ref={ref}
		data-slot="avatar"
		className={cn('relative flex size-10 shrink-0 overflow-hidden rounded-full bg-muted', className)}
		{...props}
	/>
));
Avatar.displayName = 'Avatar';

type AvatarImageSrc = AvatarPrimitive.Image.Props['src'];

// The API can return a route-relative path (the seeded `assets/images/avatars/avatar-default.svg`), which
// the browser would resolve against the current route and 404: see `normalizeImageUrl`. An empty `src`
// makes the underlying <img> request the current document URL, so it becomes `undefined`, which is also
// what shows the fallback. A Blob carries its own data and is forwarded untouched.
function normalizeAvatarSrc(src: AvatarImageSrc): AvatarImageSrc {
	if (typeof src !== 'string') {
		return src;
	}
	const normalizedSrc = normalizeImageUrl(src);
	if (!normalizedSrc) {
		return undefined;
	}
	return normalizedSrc;
}

const AvatarImage = React.forwardRef<HTMLImageElement, AvatarPrimitive.Image.Props>(
	({ className, src, ...props }, ref) => {
		const normalizedSrc = normalizeAvatarSrc(src);
		return (
			<AvatarPrimitive.Image
				ref={ref}
				data-slot="avatar-image"
				className={cn('aspect-square size-full object-cover', className)}
				src={normalizedSrc}
				{...props}
			/>
		);
	}
);
AvatarImage.displayName = 'AvatarImage';

interface AvatarFallbackProps extends AvatarPrimitive.Fallback.Props {
	delayMs?: number;
}

const AvatarFallback = React.forwardRef<HTMLSpanElement, AvatarFallbackProps>(
	({ className, delayMs, delay, ...props }, ref) => {
		const resolvedDelay = delay ?? delayMs;
		return (
			<AvatarPrimitive.Fallback
				ref={ref}
				data-slot="avatar-fallback"
				delay={resolvedDelay}
				className={cn(
					'flex size-full items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground',
					className
				)}
				{...props}
			/>
		);
	}
);
AvatarFallback.displayName = 'AvatarFallback';

export { Avatar, AvatarImage, AvatarFallback };
