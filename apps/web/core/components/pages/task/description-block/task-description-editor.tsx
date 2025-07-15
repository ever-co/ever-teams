import Toolbar from './editor-toolbar';
import {
	TextEditorService,
	withHtml,
	withChecklists,
	isValidSlateObject,
	isMarkdown,
	markdownToHtml
} from '../../../../lib/helpers/text-editor-service';
import isHotkey from 'is-hotkey';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Editor, createEditor, Element as SlateElement, Descendant, Transforms, Range } from 'slate';
import { withHistory } from 'slate-history';
import { Editable, withReact, Slate } from 'slate-react';
import EditorFooter from './editor-footer';
import { useAtom } from 'jotai';
import { detailedTaskState } from '@/core/stores';
import { htmlToSlate } from 'slate-serializers';
import { isHtml } from '../../../../lib/helpers/text-editor-service';
import LinkElement from './editor-components/link-element';
import { configHtmlToSlate } from '../../../../lib/helpers/text-editor-serializer-configurations';
import CheckListElement from './editor-components/check-list-element';

const HOTKEYS: { [key: string]: string } = {
	'mod+b': 'bold',
	'mod+i': 'italic',
	'mod+u': 'underline',
	'mod+`': 'code'
};

interface IRichTextProps {
	defaultValue?: string;
	readonly?: boolean;
	handleTemplateChange?: (key: string, value: any) => void;
}

const RichTextEditor = ({ readonly }: IRichTextProps) => {
	const renderElement = useCallback((props: any) => <Element {...props} />, []);
	const renderLeaf = useCallback((props: any) => <Leaf {...props} />, []);
	const editor = useMemo(() => withChecklists(withHtml(withHistory(withReact(createEditor())))), []);
	const [task] = useAtom(detailedTaskState);
	const [isUpdated, setIsUpdated] = useState<boolean>(false);
	const [editorValue, setEditorValue] = useState<any>();
	const editorRef = useRef<HTMLDivElement>(null);

	const initialValue = useMemo((): Descendant[] => {
		let value;
		if (task && task.description) {
			if (isHtml(task.description)) {
				// when value is an HTML
				value = htmlToSlate(task.description, configHtmlToSlate);
			} else if (isValidSlateObject(task.description)) {
				//when value is Slate Object
				value = JSON.parse(task.description) as Descendant[];
			} else if (isMarkdown(task.description)) {
				// when value is Markdown - convert to HTML first, then to Slate
				const htmlFromMarkdown = markdownToHtml(task.description);
				value = htmlToSlate(htmlFromMarkdown, configHtmlToSlate);
			} else {
				// Default case when the task.description is plain text
				value = [
					{
						//@ts-ignore
						type: 'paragraph',
						children: [{ text: task.description as string }]
					}
				];
			}
		} else {
			value = [{ type: 'paragraph', children: [{ text: '' }] }];
		}
		setEditorValue(value);
		return value;
	}, [task]);

	const clearUnsavedValues = () => {
		// Delete all entries leaving 1 empty node
		Transforms.delete(editor, {
			at: {
				anchor: Editor.start(editor, []),
				focus: Editor.end(editor, [])
			}
		});

		// Removes empty node
		Transforms.removeNodes(editor, {
			at: [0]
		});

		// Insert array of children nodes
		Transforms.insertNodes(editor, initialValue);

		setIsUpdated(false);
	};

	const selectEmoji = (emoji: { native: string }) => {
		const { selection } = editor;
		if (selection) {
			const [start] = Editor.edges(editor, selection);
			Transforms.insertText(editor, emoji.native, { at: start });
			Transforms.collapse(editor, { edge: 'end' });
		}
		setIsUpdated(false);
	};

	// Handle paste events to automatically convert markdown
	const handlePaste = useCallback(
		(event: React.ClipboardEvent) => {
			event.preventDefault();

			const pastedText = event.clipboardData.getData('text/plain');

			if (pastedText && isMarkdown(pastedText)) {
				// Convert markdown to HTML, then to Slate format
				const htmlFromMarkdown = markdownToHtml(pastedText);
				const slateNodes = htmlToSlate(htmlFromMarkdown, configHtmlToSlate);

				// Insert the converted nodes at current selection
				const { selection } = editor;
				if (selection) {
					Transforms.insertNodes(editor, slateNodes);
					setIsUpdated(true);
				}
			} else {
				// Handle regular text paste
				const { selection } = editor;
				if (selection) {
					Transforms.insertText(editor, pastedText);
					setIsUpdated(true);
				}
			}
		},
		[editor]
	);

	// Handle real-time markdown parsing while typing
	const handleKeyDown = useCallback(
		(event: React.KeyboardEvent) => {
			// Handle hotkeys first
			for (const hotkey in HOTKEYS) {
				if (isHotkey(hotkey, event as any)) {
					event.preventDefault();
					const mark = HOTKEYS[hotkey];
					TextEditorService.toggleMark(editor, mark, isMarkActive);
					return;
				}
			}

			// Handle markdown shortcuts on Space or Enter
			if (event.key === ' ' || event.key === 'Enter') {
				const { selection } = editor;
				if (selection && Range.isCollapsed(selection)) {
					const [start] = Range.edges(selection);
					const blockStart = Editor.start(editor, start.path.slice(0, -1));
					const blockRange = { anchor: blockStart, focus: start };
					const blockText = Editor.string(editor, blockRange);

					// Check for markdown patterns and transform BEFORE space is inserted
					if (transformMarkdownShortcuts(editor, blockText, blockRange, event.key)) {
						event.preventDefault();
						setIsUpdated(true);
						return;
					}
				}
			}
		},
		[editor]
	);

	// Transform markdown shortcuts in real-time
	const transformMarkdownShortcuts = useCallback((editor: any, text: string, range: any, key: string) => {
		// Only trigger on space key
		if (key !== ' ') return false;

		// Headers: ## Hello -> H2 (detect WITHOUT trailing space)
		const headerMatch = text.match(/^(#{1,6})\s+(.+)$/);
		if (headerMatch) {
			const level = headerMatch[1].length;
			const content = headerMatch[2];
			const headerType = `h${level}`;

			Transforms.delete(editor, { at: range });
			Transforms.insertNodes(editor, {
				//@ts-ignore
				type: headerType,
				children: [{ text: content }]
			} as any);
			return true;
		}

		// Lists: - Item -> Bullet list (detect WITHOUT trailing space)
		const listMatch = text.match(/^[-*+]\s+(.+)$/);
		if (listMatch) {
			const content = listMatch[1];

			Transforms.delete(editor, { at: range });
			Transforms.insertNodes(editor, {
				//@ts-ignore
				type: 'ul',
				children: [
					{
						//@ts-ignore
						type: 'li',
						children: [{ text: content }]
					}
				]
			} as any);
			return true;
		}

		// Blockquotes: > Text -> Blockquote (detect WITHOUT trailing space)
		const quoteMatch = text.match(/^>\s+(.+)$/);
		if (quoteMatch) {
			const content = quoteMatch[1];

			Transforms.delete(editor, { at: range });
			Transforms.insertNodes(editor, {
				//@ts-ignore
				type: 'blockquote',
				children: [{ text: content }]
			} as any);
			return true;
		}

		// Headers without space: ## -> H2 (just the symbols)
		const headerOnlyMatch = text.match(/^(#{1,6})$/);
		if (headerOnlyMatch) {
			const level = headerOnlyMatch[1].length;
			const headerType = `h${level}`;

			Transforms.delete(editor, { at: range });
			Transforms.insertNodes(editor, {
				//@ts-ignore
				type: headerType,
				children: [{ text: '' }]
			} as any);
			return true;
		}

		// Lists without content: - -> List item
		const listOnlyMatch = text.match(/^[-*+]$/);
		if (listOnlyMatch) {
			Transforms.delete(editor, { at: range });
			Transforms.insertNodes(editor, {
				//@ts-ignore
				type: 'ul',
				children: [
					{
						//@ts-ignore
						type: 'li',
						children: [{ text: '' }]
					}
				]
			} as any);
			return true;
		}

		// Blockquotes without content: > -> Blockquote
		const quoteOnlyMatch = text.match(/^>$/);
		if (quoteOnlyMatch) {
			Transforms.delete(editor, { at: range });
			Transforms.insertNodes(editor, {
				//@ts-ignore
				type: 'blockquote',
				children: [{ text: '' }]
			} as any);
			return true;
		}

		return false;
	}, []);

	return (
		<div className="flex flex-col prose dark:prose-invert" ref={editorRef}>
			{task && (
				<Slate
					key={task?.id}
					editor={editor}
					value={editorValue}
					onChange={(e) => {
						setEditorValue(e);
						setIsUpdated(true);
					}}
				>
					<Toolbar
						isMarkActive={isMarkActive}
						isBlockActive={isBlockActive}
						showEmojiIcon={true}
						selectEmoji={selectEmoji}
					/>
					<div className="h-[0.0625rem] bg-[#0000001A] dark:bg-[#FFFFFF29]"></div>

					<Editable
						className={`${
							readonly
								? ''
								: 'textarea resize-y block w-full bg-transparent dark:text-white h-64 overflow-y-auto scrollbar-hide'
						}`}
						id="editor-container"
						renderPlaceholder={({ children, attributes }) => (
							<div {...attributes}>
								<div className="p-0 mt-0">{children}</div>
							</div>
						)}
						renderElement={renderElement}
						renderLeaf={renderLeaf}
						placeholder="Write a complete description of your project..."
						spellCheck
						readOnly={readonly}
						onPaste={handlePaste}
						onKeyDown={handleKeyDown}
					/>
					<EditorFooter
						isUpdated={isUpdated}
						setIsUpdated={() => setIsUpdated(false)}
						editorValue={editorValue}
						editorRef={editorRef}
						clearUnsavedValues={clearUnsavedValues}
					/>
				</Slate>
			)}
		</div>
	);
};

const isBlockActive = (editor: any, format: string, blockType = 'type') => {
	const { selection } = editor;
	if (!selection) return false;

	const [match] = Array.from(
		Editor.nodes(editor, {
			at: Editor.unhangRange(editor, selection),
			match: (n) =>
				!Editor.isEditor(n) && SlateElement.isElement(n) && (n as { [key: string]: any })[blockType] === format
		})
	);

	return !!match;
};

const isMarkActive = (editor: any, format: string) => {
	const marks = Editor.marks(editor);
	return marks ? (marks as { [key: string]: any })[format] === true : false;
};

const Element = ({ attributes, children, element }: any) => {
	const style = { textAlign: element.align };
	switch (element.type) {
		case 'blockquote':
			return (
				<blockquote style={style} {...attributes}>
					{children}
				</blockquote>
			);
		case 'code':
			return (
				<pre>
					<code {...attributes}>{children}</code>
				</pre>
			);
		case 'ul':
			return (
				<ul style={style} {...attributes}>
					{children}
				</ul>
			);
		case 'h1':
			return (
				<h1 style={style} {...attributes}>
					{children}
				</h1>
			);
		case 'h2':
			return (
				<h2 style={style} {...attributes}>
					{children}
				</h2>
			);
		case 'li': // Render <li> as a block element
			return (
				<li style={style} {...attributes}>
					{children}
				</li>
			);
		case 'ol':
			return (
				<ol style={style} {...attributes}>
					{children}
				</ol>
			);
		case 'link':
			return (
				<LinkElement {...attributes} element={element}>
					{children}
				</LinkElement>
			);
		case 'checklist':
			return (
				<CheckListElement {...attributes} element={element}>
					{children}
				</CheckListElement>
			);
		default:
			return (
				<p style={style} {...attributes}>
					{children}
				</p>
			);
	}
};

const Leaf = ({ attributes, children, leaf }: any) => {
	if (leaf.bold) {
		children = <strong>{children}</strong>;
	}

	if (leaf.code) {
		children = <code>{children}</code>;
	}

	if (leaf.italic) {
		children = <em>{children}</em>;
	}

	if (leaf.underline) {
		children = <u>{children}</u>;
	}

	return <span {...attributes}>{children}</span>;
};

export default RichTextEditor;
