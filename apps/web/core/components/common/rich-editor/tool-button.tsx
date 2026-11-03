'use client';

import type { MouseEvent } from 'react';
import type { IconComponent } from '@/core/components/icons';
import { Button } from '@/core/components/duplicated-components/_button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/core/components/common/tooltip';
import { useDetectOS } from '@/core/hooks/common/use-detect-os';
import { cn } from '@/core/lib/helpers';

/** A shortcut as Tiptap binds it: "Mod" is ⌘ on a Mac and Ctrl elsewhere. */
export type ToolShortcut = readonly string[];

const MAC_KEYS: Record<string, string> = { Mod: '⌘', Shift: '⇧' };

const OTHER_KEYS: Record<string, string> = { Mod: 'Ctrl', Shift: 'Shift' };

export function useShortcutLabel() {
	const { os } = useDetectOS();
	const isMac = os === 'Mac';
	return (shortcut: ToolShortcut | undefined) => {
		if (!shortcut) {
			return undefined;
		}
		if (isMac) {
			return shortcut.map((key) => MAC_KEYS[key] ?? key).join('');
		}
		return shortcut.map((key) => OTHER_KEYS[key] ?? key).join('+');
	};
}

function keepEditorFocus(event: MouseEvent) {
	event.preventDefault();
}

/**
 * One toolbar control. The press happens with mousedown's default prevented, so the editor keeps its focus and
 * selection: a click that first blurred the text would apply bold to nothing.
 */
export function ToolButton({
	icon: Icon,
	label,
	shortcutLabel,
	active,
	disabled = false,
	onPress,
	className
}: Readonly<{
	icon: IconComponent;
	label: string;
	shortcutLabel?: string;
	active?: boolean;
	disabled?: boolean;
	onPress: () => void;
	className?: string;
}>) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					aria-label={label}
					aria-pressed={active}
					disabled={disabled}
					onMouseDown={keepEditorFocus}
					onClick={onPress}
					className={cn('text-muted-foreground', active && 'bg-foreground/5 text-foreground', className)}
				>
					<Icon aria-hidden="true" />
				</Button>
			</TooltipTrigger>
			<TooltipContent side="top">
				{label}
				{shortcutLabel && <span className="ml-1.5 text-muted-foreground">{shortcutLabel}</span>}
			</TooltipContent>
		</Tooltip>
	);
}

export function ToolDivider({ className }: Readonly<{ className?: string }>) {
	return <span aria-hidden="true" className={cn('mx-0.5 h-4 w-px shrink-0 bg-border', className)} />;
}
