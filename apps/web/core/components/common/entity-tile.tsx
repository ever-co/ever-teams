'use client';

import stc from 'string-to-color';
import { cn } from '@/core/lib/helpers';
import { imgTitle } from '@/core/lib/helpers/index';
import { isValidUrl } from '@/core/lib/utils';
import { parseGeneratedAvatar } from '@/core/lib/utils/generated-avatar';
import { dataColorGemStyle, isPaintableColor } from '@/core/components/tasks/task-data-color';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';

const TILE_BASE = 'inline-flex size-6 shrink-0 items-center justify-center rounded-[28%]';

const INITIALS_TEXT = 'text-[10px] font-semibold leading-none tracking-tight';

function tileColorOf(name: string, color: string | null | undefined, placeholderColor: string | undefined) {
	if (isPaintableColor(color)) {
		return color;
	}
	if (placeholderColor) {
		return placeholderColor;
	}
	return stc(name);
}

interface EntityTileProps {
	name?: string | null;
	color?: string | null;
	imageUrl?: string | null;
	className?: string;
}

/**
 * The tile of a team or a workspace (never a person): its logo when it has a real one, otherwise its initials in white on a faceted
 * plate of its colour (or of the placeholder's colour, or of a hue derived from its name), the plate of the issue
 * types.
 */
export function EntityTile({ name, color, imageUrl, className }: EntityTileProps) {
	const safeName = name ?? '';
	const initials = imgTitle(safeName);
	const placeholder = parseGeneratedAvatar(imageUrl);
	const gemStyle = dataColorGemStyle(tileColorOf(safeName, color, placeholder?.color));
	const hasUrl = Boolean(imageUrl) && isValidUrl(imageUrl ?? '');
	const hasRealImage = hasUrl && !placeholder;

	if (hasRealImage) {
		return (
			<Avatar className={cn(TILE_BASE, 'overflow-hidden hairline-ring ring-foreground/10', className)}>
				<AvatarImage src={imageUrl ?? undefined} alt={safeName} className="size-full object-cover" />
				<AvatarFallback className={cn('gem-plate size-full rounded-none', INITIALS_TEXT)} style={gemStyle}>
					{initials}
				</AvatarFallback>
			</Avatar>
		);
	}

	return (
		<span aria-hidden="true" className={cn(TILE_BASE, 'gem-plate', INITIALS_TEXT, className)} style={gemStyle}>
			{initials}
		</span>
	);
}
