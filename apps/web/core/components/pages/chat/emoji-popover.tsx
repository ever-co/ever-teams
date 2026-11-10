'use client';

import { type ReactNode, type RefObject, useState } from 'react';
import { useTheme } from 'next-themes';
import { LazyEmojiPicker } from '@/core/components/common/lazy-emoji-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';

/**
 * A button that opens the emoji picker and answers the picked emoji. The picker (and its dataset) is fetched when the
 * popover first opens, never with the page.
 */
export function EmojiPopover({
	label,
	onPick,
	onOpenChange,
	className,
	children,
	side = 'top',
	align = 'start',
	finalFocus
}: Readonly<{
	label: string;
	onPick: (emoji: string) => void;
	/** Told when the picker opens and closes (a hover toolbar stays visible while it is open). */
	onOpenChange?: (open: boolean) => void;
	className?: string;
	children: ReactNode;
	side?: 'top' | 'bottom' | 'left' | 'right';
	align?: 'start' | 'center' | 'end';
	/** What takes the focus when the picker closes, instead of the button (a composer keeps its caret). */
	finalFocus?: RefObject<HTMLElement | null>;
}>) {
	const { resolvedTheme } = useTheme();
	const [isOpen, setIsOpen] = useState(false);
	const change = (open: boolean) => {
		setIsOpen(open);
		onOpenChange?.(open);
	};
	return (
		<Popover open={isOpen} onOpenChange={change}>
			<PopoverTrigger className={className} aria-label={label} title={label}>
				{children}
			</PopoverTrigger>
			<PopoverContent side={side} align={align} collisionPadding={8} finalFocus={finalFocus} className="w-auto overflow-hidden p-0">
				{isOpen && (
					<LazyEmojiPicker
						onEmojiSelect={(emoji: { native: string }) => {
							change(false);
							onPick(emoji.native);
						}}
						theme={resolvedTheme}
						previewPosition="none"
						skinTonePosition="none"
						navPosition="bottom"
					/>
				)}
			</PopoverContent>
		</Popover>
	);
}
