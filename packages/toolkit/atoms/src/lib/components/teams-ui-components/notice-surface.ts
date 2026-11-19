// The surface the kit draws its notices on: the widget's notices and the messages of its forms.
export const KIT_NOTICE_SURFACE = 'rounded-lg px-3 py-2 text-xs leading-snug text-foreground ring-1';

// The button a notice offers to act on it (sign in again, try again).
export const KIT_NOTICE_ACTION =
	'shrink-0 font-medium text-primary underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none';

export type KitNoticeTone = 'neutral' | 'error';

export function kitNoticeTone(tone: KitNoticeTone): string {
	if (tone === 'neutral') {
		return 'bg-foreground/5 ring-foreground/10';
	}
	return 'bg-destructive/5 ring-destructive/20';
}
