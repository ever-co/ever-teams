/* eslint-disable no-mixed-spaces-and-tabs */
import { IClassName } from '@/core/types/interfaces/common/class-name';
import { clsxm } from '@/core/lib/utils/clsxm';
import { Button } from '@/core/components/common/button';
import { TimerPlayIcon, TimerStopIcon } from 'assets/svg';
import { MouseEventHandler, Ref } from 'react';

type Props = {
	onClick?: MouseEventHandler<HTMLButtonElement>;
	running: boolean | undefined;
	disabled: boolean;
	'aria-describedby'?: string;
	/** What the button does when it is not the plain start or stop, such as "Back to work" during a break. */
	label?: string;
	/** The page's main timer: its button carries a shadow tinted with its own colour. */
	emphasized?: boolean;
	ref?: Ref<HTMLButtonElement>;
} & IClassName;

function timerButtonVariant(running: boolean | undefined) {
	if (running) {
		return 'danger' as const;
	}
	return 'primary' as const;
}

/** The main action carries a soft shadow tinted with its own colour (start in primary, stop in destructive). */
function timerButtonGlow(running: boolean | undefined) {
	if (running) {
		return 'shadow-[0_6px_16px_-6px_hsl(var(--destructive)/0.5)]';
	}
	return 'shadow-[0_6px_16px_-6px_hsl(var(--primary)/0.55)]';
}

function TimerButtonIcon({ running }: Readonly<{ running: boolean | undefined }>) {
	if (running) {
		return <TimerStopIcon className="size-1/2" />;
	}
	return <TimerPlayIcon className="size-1/2" />;
}

export function TimerButton({
	onClick,
	running,
	disabled,
	className,
	'aria-describedby': ariaDescribedBy,
	label,
	ref,
	emphasized = false
}: Props) {
	const variant = timerButtonVariant(running);
	const defaultLabel = running ? 'Stop timer' : 'Start timer';

	return (
		<Button
			ref={ref}
			variant={variant}
			size="icon"
			onClick={onClick}
			aria-label={label ?? defaultLabel}
			aria-disabled={disabled}
			aria-describedby={ariaDescribedBy}
			className={clsxm('min-w-0', emphasized && timerButtonGlow(running), className)}
		>
			<TimerButtonIcon running={running} />
		</Button>
	);
}
