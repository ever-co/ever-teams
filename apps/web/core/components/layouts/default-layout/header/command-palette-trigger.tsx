'use client';

import { useSetAtom } from 'jotai';
import { useTranslations } from 'next-intl';
import { cn } from '@/core/lib/helpers';
import { commandPaletteOpenAtom } from '@/core/stores/common/command-palette';
import { buttonVariants } from '@/core/components/duplicated-components/_button';
import { useDetectOS } from '@/core/hooks/common/use-detect-os';
import { Search } from '../../../icons';

type CommandPaletteTriggerProps = Readonly<{
	className?: string;
	/** `sidebar`: the search field of the sidebar header, an icon alone once the rail is collapsed. `icon`: a bare icon button. */
	variant?: 'sidebar' | 'icon';
}>;

/**
 * Opens the command palette; the palette itself is mounted once for the shell (app-sidebar.tsx).
 */
export function CommandPaletteTrigger({ className, variant = 'sidebar' }: CommandPaletteTriggerProps) {
	const t = useTranslations();
	const setOpen = useSetAtom(commandPaletteOpenAtom);
	const placeholder = t('placeholders.ENTER_A_COMMAND');
	const searchLabel = t('common.SEARCH');
	const { os } = useDetectOS();
	const isMac = os === 'Mac';
	const shortcutHint = isMac ? '⌘K' : 'Ctrl K';
	const isIconOnly = variant === 'icon';

	const open = () => setOpen(true);

	if (isIconOnly) {
		return (
			<button
				type="button"
				onClick={open}
				aria-label={t('sidebar.COMMAND')}
				title={placeholder}
				className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'text-muted-foreground', className)}
			>
				<Search className="size-4" aria-hidden="true" />
			</button>
		);
	}

	return (
		<button
			type="button"
			onClick={open}
			aria-label={t('sidebar.COMMAND')}
			title={placeholder}
			className={cn(
				'flex h-8 w-full min-w-0 items-center gap-2 rounded-md hairline-border border-transparent bg-card px-2.5 text-sm text-muted-foreground',
				'hairline-ring ring-foreground/10 shadow-sm shadow-black/10 transition-[color,box-shadow] dark:ring-foreground/15',
				'hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25',
				'group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0',
				className
			)}
		>
			<Search className="size-4 shrink-0" aria-hidden="true" />
			<span className="flex-1 truncate text-left group-data-[collapsible=icon]:hidden">{searchLabel}</span>
			<kbd className="rounded-sm bg-foreground/5 px-1.5 py-0.5 font-sans text-[11px] font-medium leading-none text-muted-foreground group-data-[collapsible=icon]:hidden">
				{shortcutHint}
			</kbd>
		</button>
	);
}
