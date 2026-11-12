'use client';

import {
	FormEvent,
	KeyboardEvent,
	useId,
	useMemo,
	useRef,
	useState,
	type ChangeEvent,
	type ClipboardEvent,
	type DragEvent,
	type RefObject,
	type UIEvent
} from 'react';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { LazyEmojiPicker } from '@/core/components/common/lazy-emoji-picker';
import { StagedFileChips } from '@/core/components/common/entity-files/entity-file-chips';
import { AtSign, Attachment, Smile } from '@/core/components/icons';
import { MENU_POPUP_RECIPE, MENU_ROW_RECIPE } from '@/core/components/tasks/task-property-menu';
import { PersonAvatar } from '@/core/components/teams/people-avatars';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useMentionCandidates } from '@/core/hooks/tasks/use-mention-candidates';
import { cn } from '@/core/lib/helpers';
import { keepKeyInside } from '@/core/lib/utils/keep-key-inside';
import {
	filterMentionCandidates,
	MENTION_TRIGGER,
	mentionQueryBefore,
	mentionTextOf,
	splitMentions,
	type MentionablePerson,
	type MentionQuery,
	type MentionSegment
} from '@/core/lib/utils/comment-mentions';
import { useFocusRefOnMount } from '@/core/hooks/common/use-focus-on-mount';
import { mentionedIn, mentionEmployeeIdsOf } from '@/core/lib/utils/comment-ownership';

const TOOL_BUTTON =
	'flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25 data-[popup-open]:bg-foreground/5';

/** The field and the mention layer under it share one box and one text setting, or the marks drift off the words. */
const FIELD_BOX = 'col-start-1 row-start-1 max-h-40 min-h-10 w-full';

const FIELD_TEXT = 'text-[13px] leading-5 whitespace-pre-wrap [overflow-wrap:anywhere]';

/** A box shadow, not a padding: the mark must not move the words the field draws on top of it. */
const MENTION_MARK =
	'rounded-[3px] bg-primary/15 text-transparent shadow-[0_0_0_1.5px_hsl(var(--primary)/0.15)] dark:bg-primary/30 dark:shadow-[0_0_0_1.5px_hsl(var(--primary)/0.3)]';

/** Closes the mirror on a line break the field would draw as an empty last line. */
const MIRROR_TAIL = '​';

export type CommentSubmit = (body: string, mentionEmployeeIds: string[], files: File[]) => Promise<boolean>;

function withoutFile(files: File[], removed: File) {
	return files.filter((file) => file !== removed);
}

function hasDraggedFiles(event: DragEvent<HTMLElement>) {
	return event.dataTransfer.types.includes('Files');
}

interface TextEdit {
	value: string;
	caret: number;
}

function caretOf(field: HTMLTextAreaElement | null, fallback: number) {
	if (!field) {
		return fallback;
	}
	return field.selectionStart ?? fallback;
}

/** The text with `insert` in place of the selection (or at the end when the field never had focus). */
function insertAtCaret(field: HTMLTextAreaElement | null, text: string, insert: string): TextEdit {
	const start = caretOf(field, text.length);
	const end = field?.selectionEnd ?? start;
	const textBefore = text.slice(0, start);
	const textAfter = text.slice(end);
	const value = textBefore + insert + textAfter;
	return { value, caret: start + insert.length };
}

/** The `@` button starts a new word, so the mention menu opens even right after a letter. */
function mentionTriggerFor(text: string, caret: number) {
	const previousCharacter = text.slice(caret - 1, caret);
	const isAtTextStart = previousCharacter.length === 0;
	const followsWhitespace = /\s/.test(previousCharacter);
	const startsAWord = isAtTextStart || followsWhitespace;
	if (startsAWord) {
		return MENTION_TRIGGER;
	}
	return ` ${MENTION_TRIGGER}`;
}

function withCandidate(picked: MentionablePerson[], candidate: MentionablePerson) {
	const isAlreadyPicked = picked.some((entry) => entry.employeeId === candidate.employeeId);
	if (isAlreadyPicked) {
		return picked;
	}
	return [...picked, candidate];
}

function wrappedIndex(index: number, count: number) {
	return (index + count) % count;
}

function MirrorSegment({ segment }: Readonly<{ segment: MentionSegment }>) {
	if (segment.isMention) {
		return <mark className={MENTION_MARK}>{segment.text}</mark>;
	}
	return <span>{segment.text}</span>;
}

/** The same text drawn under the field, transparent, with a tinted mark behind each mention. */
function MentionMirror({
	text,
	names,
	mirrorRef
}: Readonly<{ text: string; names: string[]; mirrorRef: RefObject<HTMLDivElement | null> }>) {
	const segments = useMemo(() => splitMentions(text, names), [text, names]);
	return (
		<div
			ref={mirrorRef}
			aria-hidden="true"
			className={cn(FIELD_BOX, FIELD_TEXT, 'pointer-events-none overflow-hidden text-transparent')}
		>
			{segments.map((segment, index) => (
				<MirrorSegment key={`${index}-${segment.text}`} segment={segment} />
			))}
			{MIRROR_TAIL}
		</div>
	);
}

function MentionSuggestions({
	listId,
	candidates,
	activeIndex,
	onPick,
	onHighlight
}: Readonly<{
	listId: string;
	candidates: MentionablePerson[];
	activeIndex: number;
	onPick: (candidate: MentionablePerson) => void;
	onHighlight: (index: number) => void;
}>) {
	const t = useTranslations();
	return (
		<div
			id={listId}
			role="listbox"
			aria-label={t('taskDrawer.MENTION')}
			className={cn(MENU_POPUP_RECIPE, 'absolute bottom-full left-0 z-20 mb-2 w-64 p-1')}
		>
			{candidates.map((candidate, index) => {
				const isActive = index === activeIndex;
				return (
					<div
						key={candidate.employeeId}
						id={`${listId}-${index}`}
						role="option"
						tabIndex={-1}
						aria-selected={isActive}
						data-highlighted={isActive || undefined}
						onMouseDown={(event) => {
							event.preventDefault();
							onPick(candidate);
						}}
						onMouseEnter={() => onHighlight(index)}
						className={cn(MENU_ROW_RECIPE, 'data-highlighted:bg-foreground/5')}
					>
						<PersonAvatar
							person={{ id: candidate.employeeId, name: candidate.name, imageUrl: candidate.imageUrl }}
							className="size-5 text-[9px] ring-0"
						/>
						<span className="min-w-0 flex-1 truncate">{candidate.name}</span>
					</div>
				);
			})}
		</div>
	);
}

function EmojiButton({ onPick }: Readonly<{ onPick: (emoji: string) => void }>) {
	const t = useTranslations();
	const { resolvedTheme } = useTheme();
	const [isOpen, setIsOpen] = useState(false);
	const pick = (emoji: { native: string }) => {
		onPick(emoji.native);
		setIsOpen(false);
	};
	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger className={TOOL_BUTTON} aria-label={t('taskDrawer.ADD_EMOJI')}>
				<Smile className="size-4" />
			</PopoverTrigger>
			<PopoverContent align="start" side="top" className="w-auto overflow-hidden p-0">
				{isOpen && (
					<LazyEmojiPicker
						onEmojiSelect={pick}
						theme={resolvedTheme}
						previewPosition="none"
						skinTonePosition="none"
						navPosition="bottom"
					/>
				)}
			</PopoverContent>
		</Popover>
	);
}

/**
 * The comment field of good-task-aside-modal: the writer's avatar and the text, then the tools and the send button.
 * Typing `@` (or the @ tool) lists the team's people; a picked name is marked in the field, and the people still
 * named when it is sent go to Gauzy as `mentionEmployeeIds`, which notifies them.
 */
export function CommentComposer({
	placeholder,
	onSubmit,
	isPosting,
	autoFocus = false,
	onCancel,
	canAttach = false,
	initialBody = '',
	submitLabel
}: Readonly<{
	placeholder: string;
	onSubmit: CommentSubmit;
	isPosting: boolean;
	autoFocus?: boolean;
	onCancel?: () => void;
	/** Files picked, pasted or dropped wait as chips and are posted with the comment. */
	canAttach?: boolean;
	/** The text the field starts with (an edit): the people it mentions stay mentioned unless their name is removed. */
	initialBody?: string;
	/** The send button's label (an edit saves); "Comment" by default. */
	submitLabel?: string;
}>) {
	const t = useTranslations();
	const listId = useId();
	const { data: user } = useUserQuery();
	const candidates = useMentionCandidates();
	const names = useMemo(() => candidates.map((candidate) => candidate.name), [candidates]);
	const [body, setBody] = useState(initialBody);
	const [picked, setPicked] = useState<MentionablePerson[]>([]);
	const [mentionQuery, setMentionQuery] = useState<MentionQuery | null>(null);
	const [activeIndex, setActiveIndex] = useState(0);
	const [stagedFiles, setStagedFiles] = useState<File[]>([]);
	const fieldRef = useRef<HTMLTextAreaElement>(null);
	useFocusRefOnMount(fieldRef, autoFocus);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const mirrorRef = useRef<HTMLDivElement>(null);

	let suggestions: MentionablePerson[] = [];
	if (mentionQuery) {
		suggestions = filterMentionCandidates(candidates, mentionQuery.query);
	}
	const showsSuggestions = suggestions.length > 0;
	const highlightedIndex = Math.min(activeIndex, suggestions.length - 1);
	const trimmedBody = body.trim();
	const hasStagedFiles = stagedFiles.length > 0;
	const canSend = trimmedBody.length > 0 && !isPosting;
	const userName = user?.name ?? '';
	let activeOptionId: string | undefined;
	if (showsSuggestions) {
		activeOptionId = `${listId}-${highlightedIndex}`;
	}

	const readMentionQuery = (text: string, caret: number) => {
		setMentionQuery(mentionQueryBefore(text, caret));
		setActiveIndex(0);
	};

	const applyEdit = (edit: TextEdit) => {
		const field = fieldRef.current;
		setBody(edit.value);
		readMentionQuery(edit.value, edit.caret);
		requestAnimationFrame(() => {
			field?.focus();
			field?.setSelectionRange(edit.caret, edit.caret);
		});
	};

	const insert = (text: string) => {
		applyEdit(insertAtCaret(fieldRef.current, body, text));
	};

	const startMention = () => {
		const caret = caretOf(fieldRef.current, body.length);
		insert(mentionTriggerFor(body, caret));
	};

	const pick = (candidate: MentionablePerson) => {
		if (!mentionQuery) {
			return;
		}
		const caret = caretOf(fieldRef.current, body.length);
		const mention = `${mentionTextOf(candidate)} `;
		const textBefore = body.slice(0, mentionQuery.start);
		const textAfter = body.slice(caret);
		const value = textBefore + mention + textAfter;
		setPicked((current) => withCandidate(current, candidate));
		applyEdit({ value, caret: textBefore.length + mention.length });
		setMentionQuery(null);
	};

	const send = async () => {
		if (!canSend) {
			return;
		}
		// An edit keeps the mentions its text already holds: the platform replaces the comment's with this list. Only a
		// complete "@Full Name" counts, read against every known name, so "@Ann Lee" never notifies an "Ann". A name
		// typed (or pasted) in full without picking it counts when it is one person's; a namesake only when picked.
		const mentionEmployeeIds = mentionEmployeeIdsOf(trimmedBody, candidates, [
			...picked,
			...mentionedIn(initialBody, candidates)
		]);
		const isSaved = await onSubmit(trimmedBody, mentionEmployeeIds, stagedFiles);
		if (isSaved) {
			setBody('');
			setPicked([]);
			setMentionQuery(null);
			setStagedFiles([]);
		}
	};

	const stage = (files: File[]) => {
		if (!canAttach) {
			return;
		}
		setStagedFiles((current) => [...current, ...files]);
	};

	const unstage = (file: File) => {
		setStagedFiles((current) => withoutFile(current, file));
	};

	const handlePickedFiles = (event: ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(event.target.files ?? []);
		event.target.value = '';
		stage(files);
	};

	const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
		const files = Array.from(event.clipboardData.files);
		const hasPastedFiles = files.length > 0;
		if (!canAttach || !hasPastedFiles) {
			return;
		}
		event.preventDefault();
		stage(files);
	};

	const handleDragOver = (event: DragEvent<HTMLFormElement>) => {
		if (!canAttach || !hasDraggedFiles(event)) {
			return;
		}
		event.preventDefault();
	};

	const handleDrop = (event: DragEvent<HTMLFormElement>) => {
		if (!canAttach || !hasDraggedFiles(event)) {
			return;
		}
		event.preventDefault();
		stage(Array.from(event.dataTransfer.files));
	};

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		void send();
	};

	const handleSuggestionKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
		const count = suggestions.length;
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			setActiveIndex(wrappedIndex(highlightedIndex + 1, count));
			return true;
		}
		if (event.key === 'ArrowUp') {
			event.preventDefault();
			setActiveIndex(wrappedIndex(highlightedIndex - 1, count));
			return true;
		}
		const isPickKey = event.key === 'Enter' || event.key === 'Tab';
		if (isPickKey) {
			event.preventDefault();
			pick(suggestions[highlightedIndex]);
			return true;
		}
		if (event.key === 'Escape') {
			keepKeyInside(event);
			setMentionQuery(null);
			return true;
		}
		return false;
	};

	const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
		if (showsSuggestions) {
			const isHandled = handleSuggestionKey(event);
			if (isHandled) {
				return;
			}
		}
		const isEnter = event.key === 'Enter';
		const hasCommandKey = event.metaKey || event.ctrlKey;
		const isShortcut = isEnter && hasCommandKey;
		if (isShortcut) {
			event.preventDefault();
			void send();
			return;
		}
		const isCancel = event.key === 'Escape' && Boolean(onCancel);
		if (isCancel) {
			keepKeyInside(event);
			onCancel?.();
		}
	};

	const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
		const field = event.target;
		setBody(field.value);
		readMentionQuery(field.value, caretOf(field, field.value.length));
	};

	const followCaret = () => {
		const field = fieldRef.current;
		if (!field) {
			return;
		}
		readMentionQuery(field.value, caretOf(field, field.value.length));
	};

	const syncMirrorScroll = (event: UIEvent<HTMLTextAreaElement>) => {
		const mirror = mirrorRef.current;
		if (mirror) {
			mirror.scrollTop = event.currentTarget.scrollTop;
		}
	};

	return (
		<form
			onSubmit={handleSubmit}
			onDragOver={handleDragOver}
			onDrop={handleDrop}
			className="relative flex min-w-0 flex-col rounded-xl bg-card hairline-ring ring-border transition-shadow focus-within:ring-foreground/25"
		>
			{showsSuggestions && (
				<MentionSuggestions
					listId={listId}
					candidates={suggestions}
					activeIndex={highlightedIndex}
					onPick={pick}
					onHighlight={setActiveIndex}
				/>
			)}
			<div className="flex min-w-0 gap-3 px-3 pt-3 pb-1.5">
				<PersonAvatar
					person={{ id: user?.id ?? 'me', name: userName, imageUrl: user?.imageUrl }}
					className="size-6 shrink-0 text-[10px] ring-0"
				/>
				<div className="grid min-w-0 flex-1 pt-0.5">
					<MentionMirror text={body} names={names} mirrorRef={mirrorRef} />
					<textarea
						ref={fieldRef}
						rows={2}
						value={body}
						onChange={handleChange}
						onKeyDown={handleKeyDown}
						onClick={followCaret}
						onBlur={() => setMentionQuery(null)}
						onScroll={syncMirrorScroll}
						onPaste={handlePaste}
						placeholder={placeholder}
						aria-label={placeholder}
						role="combobox"
						aria-autocomplete="list"
						aria-expanded={showsSuggestions}
						aria-controls={listId}
						aria-activedescendant={activeOptionId}
						className={cn(
							FIELD_BOX,
							FIELD_TEXT,
							'field-sizing-content resize-none overflow-y-auto bg-transparent text-foreground outline-none placeholder:text-muted-foreground/75'
						)}
					/>
				</div>
			</div>
			{hasStagedFiles && (
				<div className="px-3 pb-1.5 pl-11">
					<StagedFileChips files={stagedFiles} onRemove={unstage} />
				</div>
			)}
			<div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5 px-3 pb-2.5 pl-11">
				<div className="flex items-center gap-0.5">
					<EmojiButton onPick={insert} />
					{canAttach && (
						<button
							type="button"
							className={TOOL_BUTTON}
							aria-label={t('entityFiles.ATTACH')}
							title={t('entityFiles.ATTACH')}
							onClick={() => fileInputRef.current?.click()}
						>
							<Attachment className="size-4" />
						</button>
					)}
					{canAttach && (
						<input
							ref={fileInputRef}
							type="file"
							multiple
							tabIndex={-1}
							aria-hidden="true"
							onChange={handlePickedFiles}
							className="sr-only"
						/>
					)}
					<button
						type="button"
						className={TOOL_BUTTON}
						aria-label={t('taskDrawer.MENTION')}
						onClick={startMention}
					>
						<AtSign className="size-4" />
					</button>
				</div>
				<div className="ml-auto flex shrink-0 items-center gap-2">
					{onCancel && (
						<Button type="button" variant="ghost" size="sm" onClick={onCancel}>
							{t('common.CANCEL')}
						</Button>
					)}
					<Button type="submit" size="sm" disabled={!canSend}>
						{submitLabel ?? t('common.COMMENT')}
					</Button>
				</div>
			</div>
		</form>
	);
}
