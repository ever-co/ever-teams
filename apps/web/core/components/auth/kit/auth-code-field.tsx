'use client';

import { useEffect, useRef, type FormEvent, type MutableRefObject, type ReactNode, type Ref } from 'react';
import { CircleAlert } from '@/core/components/icons';
import { AuthCodeInputField, type AuthCodeRef } from '@/core/components/auth/auth-code-input';
import { cn } from '@/core/lib/helpers';
import { canAnimate } from '@/core/lib/utils/motion';
import { AUTH_LABEL, AUTH_LINE_ARRIVAL } from './auth-recipes';

export type AuthCodeStatus = 'idle' | 'loading' | 'success' | 'error';

/** The AUTH_CODE_LENGTH slots split 4 + 4: the dash sits at the centre of the row, in the wider middle gap. */
const GROUPED_ROW = 'flex w-full justify-between gap-1.5 [&>input:nth-child(4)]:mr-4';

/** The placeholder is a space so `:placeholder-shown` tells an empty slot from a filled one. */
const GROUPED_SLOT =
	'h-11 w-full min-w-0 max-w-10 flex-1 px-0 text-center text-base font-semibold tabular-nums uppercase placeholder-shown:bg-foreground/[0.035] placeholder-shown:shadow-none dark:placeholder-shown:bg-foreground/[0.04] focus-visible:bg-background dark:focus-visible:bg-foreground/[0.06]';

const SETTLE_KEYFRAMES: Keyframe[] = [{ transform: 'scale(0.9)' }, { transform: 'scale(1)' }];
const SETTLE_TIMING: KeyframeAnimationOptions = { duration: 160, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' };

const SHAKE_KEYFRAMES: Keyframe[] = [
	{ transform: 'translateX(0)' },
	{ transform: 'translateX(-6px)' },
	{ transform: 'translateX(5px)' },
	{ transform: 'translateX(-3px)' },
	{ transform: 'translateX(2px)' },
	{ transform: 'translateX(0)' }
];
const SHAKE_TIMING: KeyframeAnimationOptions = { duration: 380, easing: 'ease-out' };

function hintTypeOf(status: AuthCodeStatus) {
	if (status === 'error') {
		return 'error' as const;
	}
	if (status === 'success') {
		return 'success' as const;
	}
	return undefined;
}

function errorRefOf(hasError: boolean, errorId: string) {
	if (hasError) {
		return errorId;
	}
	return undefined;
}

function settleSlot(slot: HTMLInputElement | undefined) {
	if (!slot) {
		return;
	}
	if (!canAnimate(slot)) {
		return;
	}
	slot.animate(SETTLE_KEYFRAMES, SETTLE_TIMING);
}

type AuthCodeFieldProps = {
	id: string;
	label: ReactNode;
	labelAside?: ReactNode;
	status: AuthCodeStatus;
	error?: string | null;
	codeRef?: Ref<AuthCodeRef>;
	inputReference?: MutableRefObject<HTMLInputElement[]>;
	defaultValue?: string;
	/** A code that came with the link: it fills the slots and submits by itself. */
	autoComplete?: string;
	autoFocus?: boolean;
	submitCode?: () => void;
	onChange: (code: string) => void;
};

export function AuthCodeField({
	id,
	label,
	labelAside,
	status,
	error,
	codeRef,
	inputReference,
	defaultValue,
	autoComplete,
	autoFocus = true,
	submitCode,
	onChange
}: Readonly<AuthCodeFieldProps>) {
	const ownSlots = useRef<HTMLInputElement[]>([]);
	const slotsRef = inputReference ?? ownSlots;
	const groupRef = useRef<HTMLDivElement>(null);
	const typedLength = useRef(0);
	const typedSlot = useRef<HTMLInputElement | null>(null);
	const labelId = `${id}-label`;
	const errorId = `${id}-error`;
	const hasError = Boolean(error);

	useEffect(() => {
		const group = groupRef.current;
		if (status !== 'error') {
			return;
		}
		if (!group) {
			return;
		}
		if (!canAnimate(group)) {
			return;
		}
		group.animate(SHAKE_KEYFRAMES, SHAKE_TIMING);
	}, [status]);

	const noteTypedSlot = (event: FormEvent<HTMLDivElement>) => {
		typedSlot.current = event.target as HTMLInputElement;
	};

	/** A paste or a code from the link fills the slots from the first one, and fires no input event. */
	const handleChange = (code: string) => {
		const grew = code.length > typedLength.current;
		typedLength.current = code.length;
		const lastFilledSlot = slotsRef.current[code.length - 1];
		const changedSlot = typedSlot.current ?? lastFilledSlot;
		typedSlot.current = null;
		if (grew) {
			settleSlot(changedSlot);
		}
		onChange(code);
	};

	return (
		<div className="flex flex-col gap-2">
			<div className="flex min-h-4 items-center justify-between gap-3">
				<span id={labelId} className={AUTH_LABEL}>
					{label}
				</span>
				{labelAside}
			</div>
			<fieldset aria-labelledby={labelId} aria-describedby={errorRefOf(hasError, errorId)} className="min-w-0">
				<div ref={groupRef} className="relative" onInput={noteTypedSlot}>
					<AuthCodeInputField
						ref={codeRef}
						inputReference={slotsRef}
						allowedCharacters="alphanumeric"
						containerClassName={GROUPED_ROW}
						inputClassName={GROUPED_SLOT}
						placeholder=" "
						defaultValue={defaultValue}
						autoComplete={autoComplete}
						submitCode={submitCode}
						onChange={handleChange}
						hintType={hintTypeOf(status)}
						autoFocus={autoFocus}
					/>
					<span
						aria-hidden="true"
						className="pointer-events-none absolute top-1/2 left-1/2 h-0.5 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/25"
					/>
				</div>
			</fieldset>
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
		</div>
	);
}
