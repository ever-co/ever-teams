import isHotkey from 'is-hotkey';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Editor, createEditor, Element as SlateElement, Descendant, Transforms } from 'slate';
import { withHistory } from 'slate-history';
import { Editable, withReact, Slate } from 'slate-react';
import { useAtom } from 'jotai';
import { detailedTaskState } from '@app/stores';
import { htmlToSlate } from 'slate-serializers';
import CheckListElement from '@components/pages/task/description-block/editor-components/CheckListElement';
import LinkElement from '@components/pages/task/description-block/editor-components/LinkElement';
import { configHtmlToSlate } from '@components/pages/task/description-block/editor-components/serializerConfigurations';
import {
	withChecklists,
	withHtml,
	isHtml,
	isValidSlateObject,
	TextEditorService
} from '@components/pages/task/description-block/editor-components/TextEditorService';
import Toolbar from './tool-bar';
import { cn } from '@/lib/utils';
import type { BaseElement as BsE } from 'slate';

const HOTKEYS: { [key: string]: string } = {
	'mod+b': 'bold',
	'mod+i': 'italic',
	'mod+u': 'underline',
	'mod+`': 'code'
};

interface IRichTextProps {
	defaultValue?: string;
	readonly?: boolean;
	onChange?: (value: string) => void;
}

const RichTextEditor = ({ readonly, onChange }: IRichTextProps) => {
	const renderElement = useCallback((props: any) => <Element {...props} />, []);
	const renderLeaf = useCallback((props: any) => <Leaf {...props} />, []);
	const editor = useMemo(() => withChecklists(withHtml(withHistory(withReact(createEditor())))), []);
	const [task] = useAtom(detailedTaskState);
	const [editorValue, setEditorValue] = useState<any>([]);
	const editorRef = useRef<HTMLDivElement>(null);
	const [characters, setCharacters] = useState(0);

	const initialValue = useMemo((): Descendant[] => {
		let value;
		if (task && task.description) {
			if (isHtml(task.description)) {
				// when value is an HTML
				value = htmlToSlate(task.description, configHtmlToSlate);
			} else if (isValidSlateObject(task.description)) {
				//when value is Slate Object
				value = JSON.parse(task.description) as Descendant[];
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
	};
	return (
		<div>
			<div className="flex flex-col prose border rounded-xl text-xs dark:prose-invert" ref={editorRef}>
				<Slate
					key={task?.id}
					editor={editor}
					value={editorValue}
					onChange={(e) => {
						const data = e as BsE[];
						const texts = data.flatMap((el) => el.children) as { text: string }[];
						setEditorValue(e);
						onChange?.(texts.map((el) => el.text).join(' '));
						setCharacters(texts.map((el) => el.text).join(' ').length);
					}}
				>
					<Toolbar isMarkActive={isMarkActive} isBlockActive={isBlockActive} />

					<Editable
						onChange={(e) => console.log(e.target)}
						className={cn(
							'px-[.65rem] text-xs',
							readonly
								? ''
								: 'textarea  block w-full bg-transparent dark:text-white h-28 overflow-y-auto scrollbar-hide'
						)}
						id="editor-container"
						renderPlaceholder={({ children, attributes }) => (
							<div {...attributes}>
								<div className="p-0 mt-0">{children}</div>
							</div>
						)}
						renderElement={renderElement}
						renderLeaf={renderLeaf}
						placeholder="Insert a description here..."
						spellCheck
						readOnly={readonly}
						maxLength={120}
						onKeyDown={(event) => {
							for (const hotkey in HOTKEYS) {
								if (isHotkey(hotkey, event as any)) {
									event.preventDefault();
									const mark = HOTKEYS[hotkey];
									TextEditorService.toggleMark(editor, mark, isMarkActive);
								}
							}
						}}
					/>
				</Slate>
			</div>
			<div className="w-full flex text-gray-500 items-center text-xs py-[.125rem] px-2 justify-end">
				{characters}
				/120
			</div>
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
