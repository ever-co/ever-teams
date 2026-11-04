import { PropsWithChildren } from 'react';
import { cn } from '@/core/lib/helpers';

/** The one anatomy of the system pages: a centred card with a status orb or an icon tile, the title, one sentence, the action. */
export const SYSTEM_PAGE_TITLE_CLASS = 'text-xl font-semibold text-balance text-foreground';
export const SYSTEM_PAGE_TEXT_CLASS = 'text-sm text-balance text-muted-foreground';
export const SYSTEM_PAGE_EYEBROW_CLASS = 'text-sm font-medium text-primary-ink';
export const SYSTEM_PAGE_ICON_TILE_CLASS =
	'keycap-3d flex size-11 items-center justify-center rounded-xl text-foreground [&_svg]:size-5';

/**
 * The card of a focused page (`FocusCard`'s surface), centred in whatever frame shows it: the focus shell for the
 * pages outside the workspace, the page panel for the ones the app shows inside it (offline, not found).
 */
export function SystemPageFrame({ children, className }: Readonly<PropsWithChildren<{ className?: string }>>) {
	return (
		<div
			className={cn(
				'mx-auto my-auto flex w-full max-w-md flex-col items-center gap-3 rounded-2xl bg-card px-6 py-9 text-center text-card-foreground hairline-ring ring-border shadow-md shadow-black/6.5 sm:px-8',
				className
			)}
		>
			{children}
		</div>
	);
}
