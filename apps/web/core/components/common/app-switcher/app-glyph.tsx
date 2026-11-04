import type { EverApp } from '@/core/constants/config/ever-apps';
import { cn } from '@/core/lib/helpers';

const GLYPH_BASE = 'shrink-0 select-none rounded-[28%] object-cover ring-1 ring-foreground/10 dark:ring-foreground/20';

const GLYPH_SIZES = {
	sm: { pixels: 24, className: 'size-6' },
	md: { pixels: 32, className: 'size-8' }
} as const;

type AppGlyphSize = keyof typeof GLYPH_SIZES;

/** Decorative: the app's name always sits next to the tile or labels its link. */
export function AppGlyph({
	app,
	size = 'sm',
	className
}: Readonly<{ app: EverApp; size?: AppGlyphSize; className?: string }>) {
	const glyphSize = GLYPH_SIZES[size];
	return (
		<img
			alt=""
			src={app.logo}
			width={glyphSize.pixels}
			height={glyphSize.pixels}
			draggable={false}
			className={cn(GLYPH_BASE, glyphSize.className, className)}
		/>
	);
}
