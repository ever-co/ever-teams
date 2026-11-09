'use client';

import { type CSSProperties, type ReactNode, useEffect, useRef } from 'react';
import { Alert, Check, Info, Loader, X } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { prefersReducedMotion } from '@/core/lib/utils/motion';

export type OrbTone = 'success' | 'error' | 'warning' | 'info' | 'loading' | 'neutral' | 'brand';

const TONE_COLOR: Record<OrbTone, string> = {
	success: 'hsl(var(--success))',
	error: 'hsl(var(--destructive))',
	warning: 'hsl(var(--warning))',
	info: 'hsl(var(--info))',
	loading: 'hsl(var(--primary))',
	neutral: 'hsl(var(--muted-foreground))',
	brand: 'hsl(var(--primary))'
};

/** The CSS colour of a tone, for surfaces that tint themselves with the orb's hue. */
export function orbToneColor(tone: OrbTone): string {
	return TONE_COLOR[tone];
}

const DEFAULT_GLYPH: Record<OrbTone, ReactNode> = {
	success: <Check />,
	error: <X />,
	warning: <Alert />,
	info: <Info />,
	loading: <Loader className="animate-spin" />,
	neutral: <Info />,
	brand: <Info />
};

/** The toast's orb sits in a soft halo of its hue (two concentric rings), the notice's smaller orb does not. */
const SIZE_CLASS = {
	md: {
		bezel: 'size-8 p-[3px] shadow-[0_0_0_var(--hairline)_hsl(var(--border)),0_0_0_4px_color-mix(in_oklab,var(--orb)_10%,transparent),0_0_0_8px_color-mix(in_oklab,var(--orb)_5%,transparent),0_1px_2px_rgb(0_0_0/0.08),0_3px_8px_-2px_color-mix(in_oklab,var(--orb)_45%,transparent)]',
		glyph: '[&_svg]:size-3.5'
	},
	sm: {
		bezel: 'size-6 p-0.5 shadow-[0_0_0_var(--hairline)_hsl(var(--border)),0_1px_2px_rgb(0_0_0/0.08),0_3px_8px_-2px_color-mix(in_oklab,var(--orb)_45%,transparent)]',
		glyph: '[&_svg]:size-3'
	}
} as const;

/** A changed state arrives out of focus and settles, the way the references swap one orb for the next. */
const ARRIVAL_KEYFRAMES: Keyframe[] = [
	{ filter: 'blur(3px) saturate(0.6)', transform: 'scale(0.82)', opacity: 0.4 },
	{ filter: 'blur(0) saturate(1)', transform: 'scale(1)', opacity: 1 }
];

const ARRIVAL_TIMING: KeyframeAnimationOptions = { duration: 280, easing: 'cubic-bezier(0.2, 0, 0, 1)' };

/**
 * The 3D status orb of toasts and notices: a light bezel ring holding a glossy disc in the tone's hue (lit from the
 * top, shaded at the bottom), the glyph in a pale tint of the same hue. It plays one short arrival when it mounts, so
 * a loading toast that turns into its result changes state visibly.
 */
export function ToastOrb({
	tone,
	glyph,
	size = 'md',
	className
}: Readonly<{ tone: OrbTone; glyph?: ReactNode; size?: keyof typeof SIZE_CLASS; className?: string }>) {
	const discRef = useRef<HTMLSpanElement>(null);

	useEffect(() => {
		const disc = discRef.current;
		if (!disc) {
			return;
		}
		// Without the Web Animations API (an older embedded browser, a test DOM) the orb simply appears.
		if (prefersReducedMotion() || typeof disc.animate !== 'function') {
			return;
		}
		disc.animate(ARRIVAL_KEYFRAMES, ARRIVAL_TIMING);
	}, []);

	const style = { '--orb': TONE_COLOR[tone] } as CSSProperties;
	const sizeClass = SIZE_CLASS[size];

	return (
		<span
			aria-hidden="true"
			style={style}
			className={cn(
				'inline-flex shrink-0 rounded-full bg-popover dark:bg-foreground/[0.06]',
				sizeClass.bezel,
				className
			)}
		>
			<span
				ref={discRef}
				className={cn(
					'relative inline-flex size-full items-center justify-center overflow-hidden rounded-full bg-(--orb) text-[color-mix(in_oklab,var(--orb)_14%,white)] shadow-[inset_0_1px_0_rgb(255_255_255/0.45),inset_0_-2px_4px_color-mix(in_oklab,var(--orb)_55%,black)] [&_svg]:relative [&_svg]:stroke-[2.25] [&_svg]:drop-shadow-[0_1px_0_color-mix(in_oklab,var(--orb)_60%,black)]',
					sizeClass.glyph
				)}
			>
				<span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-linear-to-b from-white/35 to-transparent" />
				{glyph ?? DEFAULT_GLYPH[tone]}
			</span>
		</span>
	);
}
