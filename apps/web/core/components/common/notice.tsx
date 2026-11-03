import type { CSSProperties, ReactNode } from 'react';
import { X } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { Button } from '@/core/components/duplicated-components/_button';
import { OrbTone, orbToneColor, ToastOrb } from './toast-orb';

interface NoticeBaseProps {
	tone: OrbTone;
	glyph?: ReactNode;
	title: ReactNode;
	description?: ReactNode;
	/** The main action (a pill) and, beside it, a quiet recovery link. */
	actions?: ReactNode;
	className?: string;
}

type NoticeDismissProps = { onDismiss: () => void; dismissLabel: string } | { onDismiss?: never; dismissLabel?: never };

type NoticeProps = NoticeBaseProps & NoticeDismissProps;

/**
 * A message that belongs to the page it sits in: a white card on a hairline, washed with its tone from the corner as
 * the toasts are, with their status orb, one sentence of context and its action. It sits in the flow: it never covers
 * content and never pushes the page header.
 */
export function Notice({
	tone,
	glyph,
	title,
	description,
	actions,
	onDismiss,
	dismissLabel,
	className
}: Readonly<NoticeProps>) {
	const isDismissible = Boolean(onDismiss);
	const toneStyle = { '--notice-tone': orbToneColor(tone) } as CSSProperties;

	return (
		<div
			role="status"
			style={toneStyle}
			className={cn(
				'flex flex-wrap items-start gap-x-3 gap-y-2 rounded-xl bg-card bg-[radial-gradient(120%_180%_at_0%_0%,color-mix(in_oklab,var(--notice-tone)_9%,transparent),transparent_45%)] px-3.5 py-3 hairline-ring ring-border shadow-sm shadow-black/6.5',
				className
			)}
		>
			<span className="flex h-5 shrink-0 items-center">
				<ToastOrb tone={tone} glyph={glyph} size="sm" />
			</span>
			<div className="flex min-w-0 flex-1 basis-56 flex-col gap-0.5">
				<p className="text-[13px] font-medium leading-5 text-foreground text-pretty">{title}</p>
				{description && (
					<div className="text-xs leading-snug text-muted-foreground text-pretty">{description}</div>
				)}
			</div>
			{actions && (
				<div className="flex shrink-0 items-center gap-2 self-center max-sm:basis-full max-sm:pl-[30px]">
					{actions}
				</div>
			)}
			{isDismissible && (
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					onClick={onDismiss}
					aria-label={dismissLabel}
					title={dismissLabel}
					className="-my-0.5 -mr-1 shrink-0 text-muted-foreground"
				>
					<X className="size-3.5" />
				</Button>
			)}
		</div>
	);
}
