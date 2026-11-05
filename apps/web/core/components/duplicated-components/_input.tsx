'use client';

import { mergeRefs } from '@/core/lib/helpers/index';
import { IClassName } from '@/core/types/interfaces/common/class-name';
import { clsxm } from '@/core/lib/utils';
import {
	Dispatch,
	forwardRef,
	MutableRefObject,
	ReactNode,
	Ref,
	SetStateAction,
	useEffect,
	useRef,
	useState
} from 'react';
import { IconsEmojiEmotions } from '@/core/components/icons';
import { useOutsideClick } from '@/core/hooks/common/use-outside-click';
import { Text } from '../common/typography';
import { SpinnerLoader } from '../common/loader';
import { LazyEmojiPicker, loadEmojiPicker } from '../common/lazy-emoji-picker';
import { controlGroupRecipe, controlRecipe } from '../common/input';

// InputField also renders on the auth pages, so the picker and its emoji dataset (over 400 KB) are fetched on first
// use instead of with the page. The dataset is resolved before the picker mounts: emoji-mart's own async `data`
// option initializes the shared dataset twice when two pickers mount before it settles.
type Props = {
	readonly errors?: Record<string, string>;
	readonly setErrors?: Dispatch<SetStateAction<Record<string, string>>>;
	wrapperClassName?: string;
	noWrapper?: boolean;
	trailingNode?: ReactNode;
	leadingNode?: ReactNode;
	autoCustomFocus?: boolean;
	notValidBorder?: boolean;
	emojis?: boolean;
	setTaskName?: (taskName: string) => void;
	ignoreElementRefForTitle?: MutableRefObject<HTMLDivElement | null>;
} & React.ComponentPropsWithRef<'input'>;

export const InputField = forwardRef<HTMLInputElement, Props>(
	(
		{
			className,
			type = 'text',
			errors,
			name,
			wrapperClassName,
			noWrapper,
			setErrors,
			trailingNode,
			leadingNode,
			autoCustomFocus,
			notValidBorder,
			emojis,
			setTaskName,
			ignoreElementRefForTitle,
			...res
		},
		ref
	) => {
		const [error, setError] = useState<string | undefined>(undefined);
		const inputRef = useRef<HTMLInputElement>(null);
		const [showEmoji, setShowEmoji] = useState<boolean>(false);
		const [clickInput, setClickInput] = useState<boolean>(false);

		const addEmoji = (emoji: { native: string }) => {
			const input = inputRef.current as HTMLInputElement | null;
			if (input) {
				const currentValue = input.value || '';
				const newValue = currentValue + emoji.native;
				if (setTaskName) {
					setTaskName(newValue);
				}
				input.value = newValue;
				input.focus();
			}
			setShowEmoji(false);
		};
		const handleOutsideClick = () => {
			setShowEmoji(false);
		};

		useEffect(() => {
			const handleClickOutside = (event: MouseEvent) => {
				if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
					setClickInput(false);
				}
			};
			document.addEventListener('mousedown', handleClickOutside);
			return () => {
				document.removeEventListener('mousedown', handleClickOutside);
			};
		}, [setClickInput]);

		const { targetEl } = useOutsideClick<HTMLDivElement>(handleOutsideClick);
		useEffect(() => {
			if (errors && name && errors[name]) {
				setError(errors[name]);
			} else {
				setError(undefined);
			}
		}, [errors, name]);

		const onKeyUp = () => {
			if (setErrors && name) {
				setErrors((ls) => ({ ...ls, [name]: '' }));
			} else {
				setError(undefined);
			}
		};

		/**
		 *  Focusing on the input field when the modal is open.
		 */
		useEffect(() => {
			if (autoCustomFocus) {
				inputRef.current?.focus();
			}
		}, [inputRef, autoCustomFocus]);

		const inputElement = (
			<input
				type={type}
				name={name}
				ref={mergeRefs([ref, inputRef])}
				className={clsxm(
					noWrapper && controlRecipe,
					!noWrapper && 'bg-transparent text-foreground outline-none placeholder:text-muted-foreground/75',
					'h-9 w-full px-3 py-1.5 rounded-md text-base md:text-sm',
					className
				)}
				onKeyUp={onKeyUp}
				onClick={() => {
					setClickInput(true);
					// This click reveals the emoji icon, which opens the picker on hover: start fetching it now.
					if (emojis) loadEmojiPicker().catch(() => undefined);
				}}
				onMouseOut={() => {
					if (showEmoji == true) {
						setShowEmoji(false);
					}
				}}
				{...res}
			/>
		);

		const filteredRefs = [targetEl, ignoreElementRefForTitle].filter(Boolean);

		return noWrapper ? (
			inputElement
		) : (
			<div className={clsxm('relative mb-3 w-full', wrapperClassName)}>
				<div
					className={clsxm(
						controlGroupRecipe,
						'justify-between h-auto',
						notValidBorder && 'border-destructive ring-destructive/20 dark:ring-destructive/40'
					)}
				>
					{leadingNode && <div className="flex items-center">{leadingNode}</div>}
					<div className="flex-1">{inputElement}</div>
					{emojis && (
						<div>
							{clickInput && (
								<div>
									<IconsEmojiEmotions
										onMouseOver={() => setShowEmoji(true)}
										className={clsxm('mr-3')}
									/>
									{showEmoji && (
										<div
											ref={mergeRefs(
												filteredRefs as (
													| Ref<HTMLDivElement>
													| MutableRefObject<HTMLDivElement>
												)[]
											)}
											className="absolute right-1 z-50"
										>
											<LazyEmojiPicker
												emojiSize={20}
												emojiButtonSize={28}
												onEmojiSelect={addEmoji}
												maxFrequentRows={0}
											/>
										</div>
									)}
								</div>
							)}
						</div>
					)}
					{trailingNode && <div className="flex items-center">{trailingNode}</div>}
				</div>
				{error && <Text.Error className="justify-self-start self-start">{error}</Text.Error>}
			</div>
		);
	}
);

InputField.displayName = 'InputField';

/**
 * TimeInputField
 */

type ITimeProps = {
	label: string;
	dash?: string;
	wrapperClassName?: string;
	loading?: boolean;
} & IClassName &
	React.ComponentPropsWithRef<'input'>;

export const TimeInputField = forwardRef<HTMLInputElement, ITimeProps>(
	({ className, type = 'text', label, dash = '__', wrapperClassName, value, loading, ...res }, ref) => {
		return (
			<div className={clsxm('flex items-center', loading && 'gap-1')}>
				<div className={clsxm('isolate relative w-7', wrapperClassName)}>
					<input
						type={type}
						ref={ref}
						value={value}
						{...res}
						className={clsxm('p-0 w-full text-center bg-transparent outline-none', className)}
					/>
					<span className="absolute left-0 w-full text-center -z-10 text-muted-foreground mt-1">{dash}</span>
				</div>

				{loading && <SpinnerLoader size={15} />}
				{!loading && <span>{label} </span>}
			</div>
		);
	}
);

TimeInputField.displayName = 'TimeInputField';

/**
 * RadioButtonField
 */
export const RadioButtonField = forwardRef<HTMLInputElement, Props>(
	({ className, type = 'radio', errors, name, wrapperClassName, noWrapper, ...res }, ref) => {
		const [error, setError] = useState<string | undefined>(undefined);

		useEffect(() => {
			if (errors && name && errors[name]) {
				setError(errors[name]);
			} else {
				setError(undefined);
			}
		}, [errors, name]);

		const inputElement = (
			<input
				type={type}
				name={name}
				ref={ref}
				className={clsxm(
					'size-4 accent-primary',
					'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25',
					className
				)}
				onKeyUp={() => setError(undefined)}
				{...res}
			/>
		);

		return noWrapper ? (
			inputElement
		) : (
			<div className={clsxm('w-full', wrapperClassName)}>
				{inputElement}
				{error && <Text.Error className="justify-self-start self-start">{error}</Text.Error>}
			</div>
		);
	}
);

RadioButtonField.displayName = 'RadioButtonField';
