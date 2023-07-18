import { Transforms, Element as SlateElement } from 'slate';
import { ReactEditor, useReadOnly, useSlateStatic } from 'slate-react';

const CheckListElement = ({ attributes, children, element }: any) => {
	const editor = useSlateStatic();
	const readOnly = useReadOnly();
	const { checked } = element;
	return (
		<div
			{...attributes}
			className="flex flex-row items-center my-[-0.7rem] py-0 "
		>
			<span contentEditable={false} className="mr-3 my-0 py-0">
				<input
					type="checkbox"
					checked={checked}
					onChange={(event) => {
						//@ts-ignore
						const path = ReactEditor.findPath(editor, element);
						const newProperties: Partial<SlateElement> = {
							//@ts-ignore
							checked: event.target.checked,
						};
						Transforms.setNodes(editor, newProperties, { at: path });
					}}
				/>
			</span>
			<span
				contentEditable={!readOnly}
				suppressContentEditableWarning
				className={`flex-1 mb-3 ${
					checked ? 'opacity-60 line-through' : 'opacity-100'
				}`}
			>
				{children}
			</span>
		</div>
	);
};

export default CheckListElement;
