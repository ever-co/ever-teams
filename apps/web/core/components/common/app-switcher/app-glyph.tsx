import type { EverApp } from '@/core/constants/config/ever-apps';
import { cn } from '@/core/lib/helpers';

const GLYPH_BASE =
	'keycap-3d inline-flex shrink-0 select-none items-center justify-center rounded-[28%] font-semibold leading-none text-foreground/80';

const GLYPH_SIZES = {
	sm: 'size-6 text-[11px]',
	md: 'size-8 text-[13px]'
} as const;

type AppGlyphSize = keyof typeof GLYPH_SIZES;

/**
 * The tile of an Ever app. The apps ship no logo in this codebase, so the tile carries the app's monogram on a key
 * cap instead of an imitation of its brand.
 */
export function AppGlyph({
	app,
	size = 'sm',
	className
}: Readonly<{ app: EverApp; size?: AppGlyphSize; className?: string }>) {
	return (
		<span aria-hidden="true" className={cn(GLYPH_BASE, GLYPH_SIZES[size], className)}>
			{app.monogram}
		</span>
	);
}
