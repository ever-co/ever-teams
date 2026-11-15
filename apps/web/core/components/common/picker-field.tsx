'use client';

import {
	useEffect,
	useRef,
	useState,
	type ChangeEvent,
	type FocusEvent,
	type InputHTMLAttributes,
	type KeyboardEvent,
	type ReactNode
} from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/core/lib/helpers';
import type { FieldWriting } from '@/core/lib/utils/typed-date-time';
import { Input } from './input';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

type InputAttributes = Omit<
	InputHTMLAttributes<HTMLInputElement>,
	'value' | 'defaultValue' | 'onChange' | 'onBlur' | 'type' | 'min' | 'max' | 'step' | 'children'
>;

/** What a date field and a time field take: the attributes of their text, with the value of the native field. */
export interface PickerFieldProps extends InputAttributes {
	value: string;
	onChange: (value: string) => void;
	/** Classes of the box that holds the text and the button: its width, mostly. */
	className?: string;
	/** Classes of the text itself: its height and size. */
	inputClassName?: string;
	/** The earliest value that can be sent, as the native field's `min`. */
	min?: string;
	/** The latest value that can be sent, as the native field's `max`. */
	max?: string;
	/**
	 * The focus left the field: its text, its button and its picker. Moving between them is not leaving, so a form that
	 * saves when the field is left does not save, and redraw, while its picker opens (#5325).
	 */
	onBlur?: () => void;
}

interface PickerFieldShellProps extends PickerFieldProps {
	writing: FieldWriting;
	pickerLabel: string;
	pickerIcon: ReactNode;
	pickerClassName?: string;
	/** The picker, which hands the value picked to `pick`. */
	renderPicker: (pick: (value: string) => void) => ReactNode;
}

/** An element of the picker marked with it takes the focus when the picker opens. */
export const PICKER_FOCUS_ATTRIBUTE = 'data-picker-focus';

/**
 * Why a value cannot be sent, as the native field said it: before the earliest value or after the latest. Both kinds
 * of value (`YYYY-MM-DD`, `HH:mm`) compare as text. The form that holds the field refuses to submit it, as before.
 */
function useRangeMessage(value: string, min: string | undefined, max: string | undefined, writing: FieldWriting) {
	const t = useTranslations();
	if (value === '') {
		return '';
	}
	if (min && value < min) {
		return t('common.PICK_THIS_OR_LATER', { value: writing.textOf(min) });
	}
	if (max && value > max) {
		return t('common.PICK_THIS_OR_EARLIER', { value: writing.textOf(max) });
	}
	return '';
}

function opensPicker(event: KeyboardEvent<HTMLInputElement>) {
	return event.key === 'ArrowDown' && !event.shiftKey && !event.ctrlKey && !event.metaKey;
}

/**
 * The text of a date or time field with the button that opens its picker, on shadcn's "date picker with input"
 * recipe. What is typed is sent as soon as it reads as a value, as a native field sends each change. Out of typing,
 * the field shows the value its form holds: what was typed is written again from it on leaving, and a text that reads
 * as none, or a value the form did not take, gives way to it.
 */
export function PickerField({
	value,
	onChange,
	writing,
	min,
	max,
	pickerLabel,
	pickerIcon,
	pickerClassName,
	renderPicker,
	className,
	inputClassName,
	disabled,
	placeholder,
	onFocus,
	onBlur,
	onKeyDown,
	...inputProps
}: Readonly<PickerFieldShellProps>) {
	const boxRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const popupRef = useRef<HTMLDivElement>(null);
	const lastLeaveRef = useRef<Event | null>(null);
	const written = writing.textOf(value);
	const [text, setText] = useState(written);
	const [isTyping, setIsTyping] = useState(false);
	const [isOpen, setIsOpen] = useState(false);
	const validityMessage = useRangeMessage(value, min, max, writing);
	let shownText = written;
	if (isTyping) {
		shownText = text;
	}

	useEffect(() => {
		inputRef.current?.setCustomValidity(validityMessage);
	}, [validityMessage]);

	const send = (next: string) => {
		if (next !== value) {
			onChange(next);
		}
	};

	/** Sends what is typed, or puts the value back when it reads as none; false when it did not read. */
	const settle = () => {
		if (text.trim() === '') {
			send('');
			setText('');
			return true;
		}
		const typed = writing.read(text);
		if (typed === null) {
			setText(written);
			return false;
		}
		send(typed);
		setText(writing.textOf(typed));
		return true;
	};

	const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
		const next = event.target.value;
		setText(next);
		if (next.trim() === '') {
			send('');
			return;
		}
		const typed = writing.read(next);
		if (typed !== null) {
			send(typed);
		}
	};

	const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (opensPicker(event)) {
			event.preventDefault();
			setIsOpen(true);
			return;
		}
		// Enter on a text that does not read puts the value back and stops there: neither the form nor the field's own
		// Enter handler acts on a value other than the one typed (#5325)
		if (event.key === 'Enter' && !settle()) {
			event.preventDefault();
			return;
		}
		onKeyDown?.(event);
	};

	const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
		setIsTyping(true);
		setText(written);
		onFocus?.(event);
	};

	const handleBlur = () => {
		if (isTyping) {
			setIsTyping(false);
			settle();
		}
	};

	/**
	 * The focus left the text, the button or the picker. The picker is drawn in a portal, whose focus events come
	 * through here, and can come twice: one leaving is told once.
	 */
	const handleLeave = (event: FocusEvent<HTMLDivElement>) => {
		if (lastLeaveRef.current === event.nativeEvent) {
			return;
		}
		lastLeaveRef.current = event.nativeEvent;
		const next = event.relatedTarget instanceof Node ? event.relatedTarget : null;
		const staysInField = next !== null && (boxRef.current?.contains(next) || popupRef.current?.contains(next));
		if (!staysInField) {
			onBlur?.();
		}
	};

	const pick = (next: string) => {
		send(next);
		setText(writing.textOf(next));
		setIsOpen(false);
	};

	const initialFocus = () => popupRef.current?.querySelector<HTMLElement>(`[${PICKER_FOCUS_ATTRIBUTE}]`) ?? true;

	return (
		<div ref={boxRef} className={cn('relative w-full min-w-0', className)} onBlur={handleLeave}>
			<Input
				ref={inputRef}
				type="text"
				autoComplete="off"
				spellCheck={false}
				value={shownText}
				placeholder={placeholder ?? writing.placeholder}
				disabled={disabled}
				onChange={handleChange}
				onKeyDown={handleKeyDown}
				onFocus={handleFocus}
				onBlur={handleBlur}
				className={cn('pe-8 tabular-nums', inputClassName)}
				{...inputProps}
			/>
			<Popover open={isOpen} onOpenChange={setIsOpen}>
				<PopoverTrigger asChild>
					<button
						type="button"
						aria-label={pickerLabel}
						title={pickerLabel}
						disabled={disabled}
						// A click keeps the focus in the text, which the picker then takes: the field is not left
						onMouseDown={(event) => event.preventDefault()}
						className="absolute inset-y-0 end-0 flex w-8 items-center justify-center rounded-e-md text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4"
					>
						{pickerIcon}
					</button>
				</PopoverTrigger>
				<PopoverContent
					ref={popupRef}
					anchor={boxRef}
					align="start"
					initialFocus={initialFocus}
					finalFocus={inputRef}
					className={cn('w-auto p-1', pickerClassName)}
				>
					{renderPicker(pick)}
				</PopoverContent>
			</Popover>
		</div>
	);
}
