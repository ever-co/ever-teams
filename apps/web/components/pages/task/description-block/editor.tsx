import Toolbar from './editor-toolbar';
import { TextEditorService } from './editor-components/TextEditorService';
import isHotkey from 'is-hotkey';
import React, { useCallback, useMemo, useState } from 'react';
import { Editor, createEditor, Element as SlateElement } from 'slate';
import { withHistory } from 'slate-history';
import { Editable, withReact, Slate } from 'slate-react';
import EditorFooter from './editor-footer';
import { useRecoilState } from 'recoil';
import { detailedTaskState } from '@app/stores';

const HOTKEYS: { [key: string]: string } = {
	'mod+b': 'bold',
	'mod+i': 'italic',
	'mod+u': 'underline',
	'mod+`': 'code',
};

interface IRichTextProps {
	defaultValue?: string;
	withToolbar?: boolean;
	readonly?: boolean;
	handleTemplateChange?: (key: string, value: any) => void;
}

const RichTextEditor = ({
	withToolbar = true,
	readonly,
}: // handleTemplateChange,
IRichTextProps) => {
	const renderElement = useCallback((props: any) => <Element {...props} />, []);
	const renderLeaf = useCallback((props: any) => <Leaf {...props} />, []);
	const editor = useMemo(() => withHistory(withReact(createEditor())), []);
	const [task] = useRecoilState(detailedTaskState);
	const [isUpdated, setIsUpdated] = useState<boolean>(false);

	const initialValue = useMemo(
		() => (task ? JSON.parse(task.description) : []),
		[task]
	);

	return (
		<div className="flex flex-col prose">
			{task && (
				<Slate
					editor={editor}
					value={initialValue}
					onChange={() => setIsUpdated(true)}
				>
					{withToolbar ? (
						<Toolbar
							isMarkActive={isMarkActive}
							isBlockActive={isBlockActive}
						/>
					) : null}

					<Editable
						className={`${
							readonly ? '' : 'textarea resize-y block w-full bg-transparent '
						}`}
						renderElement={renderElement}
						renderLeaf={renderLeaf}
						placeholder="..."
						spellCheck
						autoFocus
						readOnly={readonly}
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
					<EditorFooter
						isUpdated={isUpdated}
						setIsUpdated={() => setIsUpdated(false)}
					/>
				</Slate>
			)}
		</div>
	);
};

// // className={`${
//             readonly
//               ? ""
//               : "textarea resize-y block w-full border h-32 border-gray-300 rounded-md shadow-sm bg-gray-50 text-sm focus:border-blue-500 focus:ring-blue-500 transition duration-150 ease-in-out"
//           }`}

const isBlockActive = (editor: any, format: string, blockType = 'type') => {
	const { selection } = editor;
	if (!selection) return false;

	const [match] = Array.from(
		Editor.nodes(editor, {
			at: Editor.unhangRange(editor, selection),
			match: (n) =>
				!Editor.isEditor(n) &&
				SlateElement.isElement(n) &&
				(n as { [key: string]: any })[blockType] === format,
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
		case 'block-quote':
			return (
				<blockquote style={style} {...attributes}>
					{children}
				</blockquote>
			);
		case 'bulleted-list':
			return (
				<ul style={style} {...attributes}>
					{children}
				</ul>
			);
		case 'heading-one':
			return (
				<h1 style={style} {...attributes}>
					{children}
				</h1>
			);
		case 'heading-two':
			return (
				<h2 style={style} {...attributes}>
					{children}
				</h2>
			);
		case 'list-item':
			return (
				<li style={style} {...attributes}>
					{children}
				</li>
			);
		case 'numbered-list':
			return (
				<ol style={style} {...attributes}>
					{children}
				</ol>
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
