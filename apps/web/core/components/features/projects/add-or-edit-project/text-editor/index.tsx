import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Editor, createEditor, Descendant } from 'slate';
import { withHistory } from 'slate-history';
import { Editable, withReact, Slate } from 'slate-react';
import { Bold, Italic, Underline, Code } from 'lucide-react';
import { cn } from '@/core/lib/helpers';

interface IRichTextProps {
	defaultValue?: string;
	readonly?: boolean;
	onChange?: (value: string) => void;
}

const countWords = (text: string) => {
	return text.trim().split(/\s+/).filter((word) => word.length > 0).length;
};

const RichTextEditor = ({ readonly = false, onChange, defaultValue }: IRichTextProps) => {
	const editor = useMemo(() => withHistory(withReact(createEditor())), []);
	const [editorValue, setEditorValue] = useState<Descendant[]>(
		defaultValue
			? // @ts-ignore
				[{ type: 'paragraph', children: [{ text: defaultValue }] }]
			: [{ type: 'paragraph', children: [{ text: '' }] }]
	);
	const [wordCount, setWordCount] = useState(() => (defaultValue ? countWords(defaultValue) : 0));
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, []);

	const renderElement = useCallback((props: any) => <Element {...props} />, []);
	const renderLeaf = useCallback((props: any) => <Leaf {...props} />, []);


	const toggleMark = (format: string) => {
		// @ts-ignore
		const isActive = Editor.marks(editor)?.[format];
		if (isActive) {
			Editor.removeMark(editor, format);
		} else {
			Editor.addMark(editor, format, true);
		}
	};

	return (
		<div className="border rounded-xl flex flex-col text-xs">
			{!readonly && (
				<div className="flex gap-3 p-1 border-b">
					<ToolbarButton onClick={() => toggleMark('bold')} icon={<Bold size={14} />} />
					<ToolbarButton onClick={() => toggleMark('italic')} icon={<Italic size={14} />} />
					<ToolbarButton onClick={() => toggleMark('underline')} icon={<Underline size={14} />} />
					<ToolbarButton onClick={() => toggleMark('code')} icon={<Code size={14} />} />
				</div>
			)}
			{/* @ts-ignore */}
			<Slate
				editor={editor}
				value={editorValue}
				onChange={(value) => {
					setEditorValue(value);

					// Determine if the change is a content change (AST change) or just selection
					const isAstChange = editor.operations.some((op) => op.type !== 'set_selection');

					if (isAstChange) {
						const text = Editor.string(editor, []);
						const words = countWords(text);

						// Clear any existing timeout
						if (timeoutRef.current) {
							clearTimeout(timeoutRef.current);
						}

						// Defer state updates to avoid the React warning:
						// "Cannot update a component while rendering a different component"
						// This happens when Slate triggers normalization during a render cycle.
						timeoutRef.current = setTimeout(() => {
							setWordCount(words);
							onChange?.(text);
							timeoutRef.current = null;
						}, 0);
					}
				}}
			>
				{/* @ts-ignore */}
				<Editable
					className="p-2 min-h-[5rem] max-h-[15rem] outline-none overflow-y-auto"
					placeholder="Insert description here..."
					renderElement={renderElement}
					renderLeaf={renderLeaf}
					spellCheck
					readOnly={readonly}
				/>
			</Slate>
			<div className={cn('text-right py-1 px-2 text-xs', wordCount > 5000 ? 'text-red-500' : 'text-gray-500')}>
				{wordCount}/5000 words
			</div>
		</div>
	);
};

const ToolbarButton = ({ onClick, icon }: { onClick: () => void; icon: React.ReactNode }) => (
	<button className=" hover:bg-primary/5 rounded-sm h-fit px-2 py-1  text-[.5rem] font-light" onClick={onClick}>
		{icon}
	</button>
);

const Element = ({ attributes, children }: any) => <p {...attributes}>{children}</p>;

const Leaf = ({ attributes, children, leaf }: any) => {
	if (leaf.bold) children = <strong>{children}</strong>;
	if (leaf.code) children = <code>{children}</code>;
	if (leaf.italic) children = <em>{children}</em>;
	if (leaf.underline) children = <u>{children}</u>;

	return <span {...attributes}>{children}</span>;
};

export default RichTextEditor;
