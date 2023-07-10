import {
	Editor,
	BaseEditor,
	Transforms,
	Element as SlateElement,
	Node,
} from 'slate';

export class TextEditorService {
	static toggleMark(
		editor: BaseEditor,
		format: string,
		isMarkActive: (editor: BaseEditor, format: string) => boolean
	) {
		const isActive = isMarkActive(editor, format);

		if (isActive) {
			Editor.removeMark(editor, format);
		} else {
			Editor.addMark(editor, format, true);
		}
	}

	static toggleBlock(
		editor: BaseEditor,
		format: string,
		isBlockActive: (editor: any, format: any, blockType?: string) => boolean,
		LIST_TYPES: string[],
		TEXT_ALIGN_TYPES: string[]
	) {
		const isActive = isBlockActive(
			editor,
			format,
			TEXT_ALIGN_TYPES.includes(format) ? 'align' : 'type'
		);

		const isList = LIST_TYPES.includes(format);

		Transforms.unwrapNodes(editor, {
			match: (n) =>
				!Editor.isEditor(n) &&
				SlateElement.isElement(n) &&
				//@ts-ignore
				LIST_TYPES.includes(n.type) &&
				!TEXT_ALIGN_TYPES.includes(format),
			split: true,
		});
		let newProperties: Partial<SlateElement>;
		if (TEXT_ALIGN_TYPES.includes(format)) {
			newProperties = {
				//@ts-ignore
				align: isActive ? undefined : format,
			};
		} else {
			newProperties = {
				//@ts-ignore
				type: isActive ? 'paragraph' : isList ? 'list-item' : format,
			};
		}
		Transforms.setNodes<SlateElement>(editor, newProperties);

		if (!isActive && isList) {
			const block = { type: format, children: [] };
			Transforms.wrapNodes(editor, block);
		}
	}

	static deserialize(text: string) {
		return text.split('\n').map((line) => {
			return {
				type: 'paragraph',
				children: [{ text: line }],
			};
		});
	}

	static serialize(nodes: Node[]) {
		return nodes.map((n) => Node.string(n)).join('\n');
	}
}
