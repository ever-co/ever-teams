'use client';

import { atom, useAtomValue, useSetAtom } from 'jotai';
import { useTranslations } from 'next-intl';
import { cn } from '@/core/lib/helpers';
import { chatPanelOpenAtom } from '@/core/components/features/chat-panel/atoms/chat-panel-open.atom';
import { CommandIcon } from '../../../icons';

/**
 * Whether the command palette is open. The palette (SidebarCommandModal) is mounted once for the whole
 * shell, next to the other global modals in app-sidebar.tsx, so its keyboard shortcuts work on every
 * page; anything can open it by setting this atom.
 */
export const commandPaletteOpenAtom = atom(false);

/**
 * The compact search button Ever Works keeps in its top bar (icon · placeholder · ⌘K), left of
 * "Collaborate". Kept light on purpose: it only opens the palette, the palette itself lives elsewhere.
 * The placeholder shows once the page content is wide enough: later while the AI chat takes space.
 */
export function CommandPaletteTrigger({ className }: Readonly<{ className?: string }>) {
	const t = useTranslations();
	const setOpen = useSetAtom(commandPaletteOpenAtom);
	const chatOpen = useAtomValue(chatPanelOpenAtom);

	return (
		<button
			type="button"
			onClick={() => setOpen(true)}
			aria-label={t('sidebar.COMMAND')}
			className={cn(
				'inline-flex h-8 w-8 shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-card text-sm text-muted-foreground transition-colors',
				'hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
				chatOpen
					? '3xl:w-auto 3xl:min-w-52 3xl:justify-start 3xl:px-2.5'
					: 'xl:w-auto xl:min-w-52 xl:justify-start xl:px-2.5',
				className
			)}
		>
			<CommandIcon className="size-4 shrink-0 opacity-70" aria-hidden="true" />
			<span className={cn('hidden flex-1 truncate text-left', chatOpen ? '3xl:inline' : 'xl:inline')}>
				{t('placeholders.ENTER_A_COMMAND')}
			</span>
			<kbd
				className={cn(
					'hidden rounded border border-border bg-background px-1.5 py-0.5 font-sans text-[11px] leading-none text-muted-foreground',
					chatOpen ? '3xl:inline' : 'xl:inline'
				)}
			>
				⌘K
			</kbd>
		</button>
	);
}
