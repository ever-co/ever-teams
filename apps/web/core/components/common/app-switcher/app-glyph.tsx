import { Plus } from '@/core/components/icons/hugeicons';
import type { LauncherItem } from '@/core/lib/utils/app-launcher';
import { initialsOf } from '@/core/lib/utils/app-launcher';
import { cn } from '@/core/lib/helpers';

const GLYPH_SHAPE = 'shrink-0 select-none rounded-[28%] hairline-ring ring-foreground/10 dark:ring-foreground/20';

const GLYPH_SIZES = {
	sm: { pixels: 24, className: 'size-6 text-[10px]', iconClassName: 'size-3.5' },
	md: { pixels: 32, className: 'size-8 text-xs', iconClassName: 'size-4' }
} as const;

/** The neutral plate of a tile without a logo: an app the person added, or "+ Add". */
const PLATE = 'inline-flex items-center justify-center bg-foreground/[0.07] font-medium text-muted-foreground';

type AppGlyphSize = keyof typeof GLYPH_SIZES;

/**
 * Decorative: the app's name always sits next to the tile or labels its link. An app the person added has no logo,
 * so it gets its initials on a neutral plate (no colour: the chrome stays black and white, spec A8).
 */
export function AppGlyph({
	item,
	size = 'sm',
	className
}: Readonly<{ item: Pick<LauncherItem, 'logo' | 'name'>; size?: AppGlyphSize; className?: string }>) {
	const glyphSize = GLYPH_SIZES[size];
	if (!item.logo) {
		return (
			<span aria-hidden="true" className={cn(GLYPH_SHAPE, PLATE, glyphSize.className, className)}>
				{initialsOf(item.name)}
			</span>
		);
	}
	return (
		<img
			alt=""
			src={item.logo}
			width={glyphSize.pixels}
			height={glyphSize.pixels}
			draggable={false}
			className={cn(GLYPH_SHAPE, 'object-cover', glyphSize.className, className)}
		/>
	);
}

/** The "+" of "+ Add", on the same tile as the apps' logos. Decorative: its row or link carries the label. */
export function AddGlyph({ size = 'sm', className }: Readonly<{ size?: AppGlyphSize; className?: string }>) {
	const glyphSize = GLYPH_SIZES[size];
	return (
		<span aria-hidden="true" className={cn(GLYPH_SHAPE, PLATE, glyphSize.className, className)}>
			<Plus className={glyphSize.iconClassName} aria-hidden="true" />
		</span>
	);
}
