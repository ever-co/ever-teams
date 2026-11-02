import { Check } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';

/**
 * The mark of the picked row in a menu: a small round 3D chip in the brand hue holding a check, drawn like the
 * app's labels (`chip-3d`), so a selection reads as a value and not as a stray glyph.
 */
export function SelectedMark({ className }: Readonly<{ className?: string }>) {
	return (
		<span
			aria-hidden="true"
			className={cn(
				'chip-3d inline-flex size-[18px] shrink-0 items-center justify-center rounded-full [--chip:hsl(var(--primary))] [&_svg]:size-3 [&_svg]:stroke-[2.5]',
				className
			)}
		>
			<Check />
		</span>
	);
}
