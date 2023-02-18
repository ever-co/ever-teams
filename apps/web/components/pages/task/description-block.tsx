import { useMemo, useState } from 'react';
import { createEditor } from 'slate';
import { Slate, Editable, withReact } from 'slate-react';

const DescriptionBlock = (initialDescriptionValue?: any) => {
	const [editor] = useState(() => withReact(createEditor()));
	const initialValue = useMemo(
		() =>
			initialDescriptionValue || [
				{
					type: 'paragraph',
					children: [{ text: 'A line of text in a paragraph.' }],
				},
			],
		[]
	);

	return (
		<Slate
			editor={editor}
			value={initialValue}
			onChange={(value: any) => {
				const isAstChange = editor.operations.some(
					(op: any) => 'set_selection' !== op.type
				);
				if (isAstChange) {
					// Save the value to the database
					const content = JSON.stringify(value);
					console.log(content);
				}
			}}
		>
			<Editable />
		</Slate>
	);
};
export default DescriptionBlock;