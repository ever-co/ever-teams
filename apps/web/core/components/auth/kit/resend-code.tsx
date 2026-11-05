'use client';

import { useTranslations } from 'next-intl';
import { RotateLeft } from '@/core/components/icons';
import { SpinnerLoader } from '@/core/components/common/loader';
import { RESEND_CODE_COOLDOWN_SECONDS, useResendCooldown } from '@/core/hooks/auth/use-resend-cooldown';
import { cn } from '@/core/lib/helpers';
import { AUTH_TEXT_LINK } from './auth-recipes';

const RING_RADIUS = 6;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

function secondsOf(countdown: string) {
	const [minutes, seconds] = countdown.split(':').map(Number);
	const total = minutes * 60 + seconds;
	if (Number.isNaN(total)) {
		return 0;
	}
	return total;
}

function CooldownRing({ secondsLeft }: Readonly<{ secondsLeft: number }>) {
	const share = secondsLeft / RESEND_CODE_COOLDOWN_SECONDS;
	const offset = RING_LENGTH * (1 - share);

	return (
		<svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5 shrink-0 -rotate-90">
			<circle cx="8" cy="8" r={RING_RADIUS} fill="none" strokeWidth="2" className="stroke-foreground/10" />
			<circle
				cx="8"
				cy="8"
				r={RING_RADIUS}
				fill="none"
				strokeWidth="2"
				strokeLinecap="round"
				strokeDasharray={RING_LENGTH}
				strokeDashoffset={offset}
				className="stroke-primary transition-[stroke-dashoffset] duration-1000 ease-linear"
			/>
		</svg>
	);
}

const READY_RESEND_CLASS = cn(AUTH_TEXT_LINK, 'inline-flex items-center gap-1');

const LOCKED_RESEND_CLASS =
	'inline-flex cursor-default items-center gap-1.5 rounded-sm text-muted-foreground tabular-nums outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25';

function resendClassOf(isLocked: boolean) {
	if (isLocked) {
		return LOCKED_RESEND_CLASS;
	}
	return READY_RESEND_CLASS;
}

/** The countdown lives here, so only this line renders again every second. */
export function ResendCode({
	startLocked,
	sending,
	onResend,
	className
}: Readonly<{
	startLocked: boolean;
	sending: boolean;
	/** Resolves true once a code went out: only then does the wait start. */
	onResend: () => Promise<boolean>;
	className?: string;
}>) {
	const t = useTranslations();
	const cooldown = useResendCooldown(startLocked);
	const secondsLeft = secondsOf(cooldown.countdown);
	const isLocked = cooldown.locked || sending;
	const canResend = !isLocked;
	const isWaiting = cooldown.locked && !sending;

	const resend = async () => {
		if (isLocked) {
			return;
		}
		const wasSent = await onResend();
		if (!wasSent) {
			return;
		}
		cooldown.start();
	};

	return (
		<div className={cn('flex min-h-5 flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px]', className)}>
			<span className="text-muted-foreground">{t('auth.code.NOT_RECEIVED')}</span>
			{/* One button through sending and waiting, so the focus a keyboard put on it stays there */}
			<button
				type="button"
				onClick={resend}
				aria-disabled={isLocked || undefined}
				className={resendClassOf(isLocked)}
			>
				{sending && (
					<>
						<SpinnerLoader size={14} />
						<span className="sr-only">{t('auth.code.RESEND')}</span>
					</>
				)}
				{isWaiting && (
					<>
						<CooldownRing secondsLeft={secondsLeft} />
						{t('auth.code.RESEND_IN', { countdown: cooldown.countdown })}
					</>
				)}
				{canResend && (
					<>
						<RotateLeft aria-hidden="true" className="size-3.5" />
						{t('auth.code.RESEND')}
					</>
				)}
			</button>
		</div>
	);
}
