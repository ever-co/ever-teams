// Adapted from prompt-kit (https://www.prompt-kit.com), MIT licence.
'use client';

import {
	createContext,
	createRef,
	useCallback,
	useContext,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	type ChangeEvent,
	type ComponentProps,
	type HTMLAttributes,
	type KeyboardEvent,
	type MouseEvent,
	type MouseEventHandler,
	type ReactNode,
	type RefObject,
	type TextareaHTMLAttributes
} from 'react';
import { cn } from '@/core/lib/helpers';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/core/components/common/tooltip';

type PromptInputContextType = {
	isLoading: boolean;
	value: string;
	setValue: (value: string) => void;
	maxHeight: number | string;
	onSubmit?: () => void;
	disabled?: boolean;
	textareaRef: RefObject<HTMLTextAreaElement | null>;
};

const PromptInputContext = createContext<PromptInputContextType>({
	isLoading: false,
	value: '',
	setValue: () => {},
	maxHeight: 240,
	onSubmit: undefined,
	disabled: false,
	textareaRef: createRef<HTMLTextAreaElement>()
});

function usePromptInput() {
	return useContext(PromptInputContext);
}

const promptInputRecipe =
	'cursor-text rounded-2xl hairline-border border-transparent bg-card p-2 shadow-md shadow-black/6.5 hairline-ring ring-border transition-[box-shadow] focus-within:border-foreground/35 focus-within:ring-[3px] focus-within:ring-ring/25 dark:ring-foreground/15 dark:focus-within:border-foreground/25';

export type PromptInputProps = {
	isLoading?: boolean;
	value?: string;
	onValueChange?: (value: string) => void;
	maxHeight?: number | string;
	onSubmit?: () => void;
	children: ReactNode;
	className?: string;
	disabled?: boolean;
	textareaRef?: RefObject<HTMLTextAreaElement | null>;
} & Omit<ComponentProps<'div'>, 'onSubmit'>;

function PromptInput({
	className,
	isLoading = false,
	maxHeight = 240,
	value,
	onValueChange,
	onSubmit,
	children,
	disabled = false,
	textareaRef: providedTextareaRef,
	onClick,
	...props
}: PromptInputProps) {
	const [internalValue, setInternalValue] = useState(value || '');
	const internalTextareaRef = useRef<HTMLTextAreaElement>(null);
	const textareaRef = providedTextareaRef ?? internalTextareaRef;

	const handleChange = useCallback(
		(newValue: string) => {
			setInternalValue(newValue);
			onValueChange?.(newValue);
		},
		[onValueChange]
	);

	const handleClick: MouseEventHandler<HTMLDivElement> = (event) => {
		if (!disabled) {
			textareaRef.current?.focus();
		}
		onClick?.(event);
	};

	const contextValue = useMemo<PromptInputContextType>(
		() => ({
			isLoading,
			value: value ?? internalValue,
			setValue: onValueChange ?? handleChange,
			maxHeight,
			onSubmit,
			disabled,
			textareaRef
		}),
		[isLoading, value, internalValue, onValueChange, handleChange, maxHeight, onSubmit, disabled, textareaRef]
	);

	return (
		<PromptInputContext.Provider value={contextValue}>
			<div
				role="presentation"
				onClick={handleClick}
				className={cn(promptInputRecipe, disabled && 'cursor-not-allowed', className)}
				{...props}
			>
				{children}
			</div>
		</PromptInputContext.Provider>
	);
}

function fitHeight(element: HTMLTextAreaElement, maxHeight: number | string) {
	element.style.height = 'auto';
	if (typeof maxHeight === 'number') {
		const height = Math.min(element.scrollHeight, maxHeight);
		element.style.height = `${height}px`;
		return;
	}
	element.style.height = `min(${element.scrollHeight}px, ${maxHeight})`;
}

function isSubmitKey(event: KeyboardEvent<HTMLTextAreaElement>) {
	const isEnter = event.key === 'Enter';
	const isNewLine = event.shiftKey;
	const isComposingText = event.nativeEvent.isComposing;
	if (!isEnter) {
		return false;
	}
	if (isNewLine) {
		return false;
	}
	return !isComposingText;
}

export type PromptInputTextareaProps = {
	disableAutosize?: boolean;
} & TextareaHTMLAttributes<HTMLTextAreaElement>;

function PromptInputTextarea({ className, onKeyDown, disableAutosize = false, ...props }: PromptInputTextareaProps) {
	const { value, setValue, maxHeight, onSubmit, disabled, textareaRef } = usePromptInput();

	const adjustHeight = (element: HTMLTextAreaElement | null) => {
		if (!element) {
			return;
		}
		if (disableAutosize) {
			return;
		}
		fitHeight(element, maxHeight);
	};

	const handleRef = (element: HTMLTextAreaElement | null) => {
		textareaRef.current = element;
		adjustHeight(element);
	};

	useLayoutEffect(() => {
		const element = textareaRef.current;
		if (!element) {
			return;
		}
		if (disableAutosize) {
			return;
		}
		fitHeight(element, maxHeight);
	}, [value, maxHeight, disableAutosize, textareaRef]);

	const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
		adjustHeight(event.target);
		setValue(event.target.value);
	};

	const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
		if (isSubmitKey(event)) {
			event.preventDefault();
			onSubmit?.();
		}
		onKeyDown?.(event);
	};

	return (
		<textarea
			ref={handleRef}
			value={value}
			onChange={handleChange}
			onKeyDown={handleKeyDown}
			className={cn(
				'block min-h-11 w-full resize-none bg-transparent px-2 py-1.5 text-base text-foreground outline-none placeholder:text-muted-foreground/75 disabled:cursor-not-allowed md:text-[15px]',
				className
			)}
			rows={1}
			disabled={disabled}
			{...props}
		/>
	);
}

export type PromptInputActionsProps = HTMLAttributes<HTMLDivElement>;

function PromptInputActions({ children, className, ...props }: PromptInputActionsProps) {
	return (
		<div className={cn('flex items-center gap-2', className)} {...props}>
			{children}
		</div>
	);
}

export type PromptInputActionProps = {
	className?: string;
	tooltip: ReactNode;
	children: ReactNode;
	side?: 'top' | 'bottom' | 'left' | 'right';
} & ComponentProps<typeof Tooltip>;

function stopClickFromFocusingTextarea(event: MouseEvent) {
	event.stopPropagation();
}

function PromptInputAction({ tooltip, children, className, side = 'top', ...props }: PromptInputActionProps) {
	return (
		<Tooltip {...props}>
			<TooltipTrigger asChild onClick={stopClickFromFocusingTextarea}>
				{children}
			</TooltipTrigger>
			<TooltipContent side={side} className={className}>
				{tooltip}
			</TooltipContent>
		</Tooltip>
	);
}

export { PromptInput, PromptInputTextarea, PromptInputActions, PromptInputAction, usePromptInput };
