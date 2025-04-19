import { useCallback, useMemo, useState } from 'react';
import { Editor, createEditor, Descendant } from 'slate';
import { withHistory } from 'slate-history';
import { Editable, withReact, Slate } from 'slate-react';
import { Bold, Italic, Underline, Code } from 'lucide-react';

interface IRichTextProps {
	defaultValue?: string;
	readonly?: boolean;
	onChange?: (value: string) => void;
}

const RichTextEditor = ({ readonly = false, onChange, defaultValue }: IRichTextProps) => {
	const editor = useMemo(() => withHistory(withReact(createEditor())), []);
	const [editorValue, setEditorValue] = useState<Descendant[]>(
		defaultValue
			? // @ts-ignore
				[{ type: 'paragraph', children: [{ text: defaultValue }] }]
			: [{ type: 'paragraph', children: [{ text: '' }] }]
	);
	const [editorText, setEditorText] = useState('');

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
					const text = value.map(() => Editor.string(editor, [])).join(' ');
					setEditorText(text);
					onChange?.(text);
				}}
			>
				{/* @ts-ignore */}
				<Editable
					defaultValue={defaultValue}
					className=" p-2 h-20 outline-none"
					placeholder="Insert description here..."
					renderElement={renderElement}
					renderLeaf={renderLeaf}
					spellCheck
					readOnly={readonly}
				/>
			</Slate>
			<div className="text-right text-gray-500 py-1 px-2 text-xs">{editorText.length}/120</div>
		</div>
	);
};

const ToolbarButton = ({ onClick, icon }: { onClick: () => void; icon: React.ReactNode }) => (
	<button className=" hover:bg-primary/5 rounded h-fit px-2 py-1  text-[.5rem] font-light" onClick={onClick}>
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
