'use client';

import {
	forwardRef,
	useState,
	type ComponentPropsWithoutRef,
	type KeyboardEvent,
	type FocusEvent,
	type ReactNode
} from 'react';
import { useTranslations } from 'next-intl';
import { CircleAlert, Eye, EyeOff, Keyboard } from '@/core/components/icons';
import { controlGroupRecipe } from '@/core/components/common/input';
import { cn } from '@/core/lib/helpers';
import { AUTH_CONTROL_HEIGHT, AUTH_HINT, AUTH_LABEL, AUTH_LINE_ARRIVAL } from './auth-recipes';

type NativeInputProps = Omit<ComponentPropsWithoutRef<'input'>, 'id' | 'className'>;

type AuthFieldProps = {
	id: string;
	label: ReactNode;
	labelAside?: ReactNode;
	icon?: ReactNode;
	trailing?: ReactNode;
	error?: string | null;
	hint?: ReactNode;
	inputClassName?: string;
	className?: string;
} & NativeInputProps;

const INPUT_CLASS =
	'h-full min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground/75 read-only:text-muted-foreground md:text-sm disabled:cursor-not-allowed';

const INVALID_GROUP_CLASS = 'border-destructive ring-destructive/20 dark:ring-destructive/40';

function describedByOf(errorId: string, hintId: string, hasError: boolean, hasHint: boolean) {
	if (hasError) {
		return errorId;
	}
	if (hasHint) {
		return hintId;
	}
	return undefined;
}

export const AuthField = forwardRef<HTMLInputElement, AuthFieldProps>(function AuthField(
	{ id, label, labelAside, icon, trailing, error, hint, inputClassName, className, ...inputProps },
	ref
) {
	const errorId = `${id}-error`;
	const hintId = `${id}-hint`;
	const hasError = Boolean(error);
	const hasHint = Boolean(hint);
	const showsHint = hasHint && !hasError;

	return (
		<div className={cn('flex flex-col gap-2', className)}>
			<div className="flex min-h-4 items-center justify-between gap-3">
				<label htmlFor={id} className={AUTH_LABEL}>
					{label}
				</label>
				{labelAside}
			</div>
			<div
				className={cn(
					controlGroupRecipe,
					AUTH_CONTROL_HEIGHT,
					'gap-2 px-2.5',
					hasError && INVALID_GROUP_CLASS,
					inputProps.readOnly && 'bg-foreground/[0.03] shadow-none dark:bg-foreground/[0.03]'
				)}
			>
				{icon && (
					<span aria-hidden="true" className="flex shrink-0 text-muted-foreground [&_svg]:size-4">
						{icon}
					</span>
				)}
				<input
					ref={ref}
					id={id}
					aria-invalid={hasError || undefined}
					aria-describedby={describedByOf(errorId, hintId, hasError, hasHint)}
					className={cn(INPUT_CLASS, inputClassName)}
					{...inputProps}
				/>
				{trailing}
			</div>
			{hasError && (
				<p
					id={errorId}
					role="alert"
					className={cn('flex items-start gap-1.5 text-xs text-destructive-ink', AUTH_LINE_ARRIVAL)}
				>
					<CircleAlert aria-hidden="true" className="mt-px size-3.5 shrink-0" />
					<span>{error}</span>
				</p>
			)}
			{showsHint && (
				<div id={hintId} className={AUTH_HINT}>
					{hint}
				</div>
			)}
		</div>
	);
});

function revealGlyphClass(isShown: boolean) {
	if (isShown) {
		return 'rotate-0 scale-100 opacity-100';
	}
	return 'rotate-90 scale-75 opacity-0';
}

function revealLabelKey(isRevealed: boolean) {
	if (isRevealed) {
		return 'auth.field.HIDE_PASSWORD' as const;
	}
	return 'auth.field.SHOW_PASSWORD' as const;
}

function inputTypeOf(isRevealed: boolean) {
	if (isRevealed) {
		return 'text';
	}
	return 'password';
}

function readsCapsLock(event: KeyboardEvent<HTMLInputElement>) {
	if (typeof event.getModifierState !== 'function') {
		return false;
	}
	return event.getModifierState('CapsLock');
}

const REVEAL_BUTTON_CLASS =
	'relative -mr-1 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25';

const REVEAL_GLYPH_CLASS = 'absolute size-4 transition-[opacity,transform] duration-150 ease-out';

type PasswordFieldProps = Omit<AuthFieldProps, 'type' | 'trailing'>;

/** Caps Lock is read from key events: a browser exposes it nowhere else. */
export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(function PasswordField(
	{ hint, onKeyDown, onKeyUp, onBlur, ...fieldProps },
	ref
) {
	const t = useTranslations();
	const [isRevealed, setIsRevealed] = useState(false);
	const [isCapsLockOn, setIsCapsLockOn] = useState(false);

	const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		setIsCapsLockOn(readsCapsLock(event));
		onKeyDown?.(event);
	};
	const handleKeyUp = (event: KeyboardEvent<HTMLInputElement>) => {
		setIsCapsLockOn(readsCapsLock(event));
		onKeyUp?.(event);
	};
	const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
		setIsCapsLockOn(false);
		onBlur?.(event);
	};

	const capsLockNotice = (
		<span className={cn('flex items-center gap-1.5 text-warning-foreground', AUTH_LINE_ARRIVAL)}>
			<Keyboard aria-hidden="true" className="size-3.5 shrink-0" />
			{t('auth.field.CAPS_LOCK_ON')}
		</span>
	);
	let shownHint = hint;
	if (isCapsLockOn) {
		shownHint = capsLockNotice;
	}
	const revealKey = revealLabelKey(isRevealed);
	const revealLabel = t(revealKey);

	const revealButton = (
		<button
			type="button"
			aria-label={revealLabel}
			onClick={() => setIsRevealed((current) => !current)}
			className={REVEAL_BUTTON_CLASS}
		>
			<Eye aria-hidden="true" className={cn(REVEAL_GLYPH_CLASS, revealGlyphClass(isRevealed))} />
			<EyeOff aria-hidden="true" className={cn(REVEAL_GLYPH_CLASS, revealGlyphClass(!isRevealed))} />
		</button>
	);

	return (
		<AuthField
			ref={ref}
			type={inputTypeOf(isRevealed)}
			trailing={revealButton}
			hint={shownHint}
			onKeyDown={handleKeyDown}
			onKeyUp={handleKeyUp}
			onBlur={handleBlur}
			autoCapitalize="none"
			spellCheck={false}
			{...fieldProps}
		/>
	);
});
