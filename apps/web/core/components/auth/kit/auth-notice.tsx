import type { ReactNode } from 'react';
import { Alert, CircleAlert, Info } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { AUTH_LINE_ARRIVAL } from './auth-recipes';

type NoticeTone = 'error' | 'warning' | 'info';

const TONE_CLASS: Record<NoticeTone, string> = {
	error: 'bg-destructive/[0.06] text-destructive-ink',
	warning: 'bg-warning/10 text-warning-foreground',
	info: 'bg-foreground/[0.04] text-foreground'
};

function glyphOf(tone: NoticeTone) {
	if (tone === 'error') {
		return <CircleAlert aria-hidden="true" />;
	}
	if (tone === 'warning') {
		return <Alert aria-hidden="true" />;
	}
	return <Info aria-hidden="true" />;
}

function roleOf(tone: NoticeTone) {
	if (tone === 'info') {
		return 'status';
	}
	return 'alert';
}

export function AuthNotice({
	tone,
	title,
	children,
	className
}: Readonly<{ tone: NoticeTone; title?: ReactNode; children?: ReactNode; className?: string }>) {
	const glyph = glyphOf(tone);
	const role = roleOf(tone);

	return (
		<div
			role={role}
			className={cn(
				'flex items-start gap-2.5 rounded-xl px-3 py-2.5 text-[13px]',
				TONE_CLASS[tone],
				AUTH_LINE_ARRIVAL,
				className
			)}
		>
			<span className="mt-0.5 flex shrink-0 [&_svg]:size-4">{glyph}</span>
			<div className="flex min-w-0 flex-col gap-0.5">
				{title && <p className="font-medium">{title}</p>}
				{children && <div className="text-xs text-pretty opacity-90">{children}</div>}
			</div>
		</div>
	);
}
