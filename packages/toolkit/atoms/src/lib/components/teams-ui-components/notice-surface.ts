// The surface the kit draws its notices on: the widget's notices and the messages of its forms.
export const KIT_NOTICE_SURFACE = 'rounded-lg px-3 py-2 text-xs leading-snug text-foreground ring-1';

// The button a notice offers to act on it (sign in again, try again). The kit's primary purple is the same in both
// schemes and too dark to read on the dark surface: the dark scheme takes its light variant.
export const KIT_NOTICE_ACTION =
	'shrink-0 font-medium text-primary underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none dark:text-primary-xlight';

export type KitNoticeTone = 'neutral' | 'error';

// A notice is drawn on the kit's own background, its tint laid over it, never on transparency, so it stays readable on
// a host page of the other color scheme (#5575).
export function kitNoticeTone(tone: KitNoticeTone): string {
	if (tone === 'neutral') {
		return 'bg-background bg-[linear-gradient(hsl(var(--foreground)/0.05),hsl(var(--foreground)/0.05))] ring-foreground/10';
	}
	return 'bg-background bg-[linear-gradient(hsl(var(--destructive)/0.05),hsl(var(--destructive)/0.05))] ring-destructive/20';
}
