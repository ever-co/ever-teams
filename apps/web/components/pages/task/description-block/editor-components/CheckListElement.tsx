import { Transforms, Element as SlateElement } from 'slate';
import { ReactEditor, useReadOnly, useSlateStatic } from 'slate-react';
import { CheckBoxIcon, UncheckedBoxIcon } from 'lib/components/svgs';
import { useRef } from 'react';

const CheckListElement = ({ attributes, children, element }: any) => {
	const editor = useSlateStatic();
	const readOnly = useReadOnly();
	const { checked } = element;

	const checkboxRef = useRef<HTMLInputElement>(null);
	const toggleCheck = () => {
		if (checkboxRef.current) {
			checkboxRef.current.click();
		}
	};
	return (
		<div {...attributes} className="flex flex-row items-center my-[-0.7rem]">
			<span contentEditable={false} className="mr-[1.2rem] relative">
				<input
					type="checkbox"
					checked={checked}
					ref={checkboxRef}
					onChange={(event) => {
						//@ts-ignore
						const path = ReactEditor.findPath(editor, element);
						const newProperties: Partial<SlateElement> = {
							//@ts-ignore
							checked: event.target.checked,
						};
						Transforms.setNodes(editor, newProperties, { at: path });
					}}
					className="scale-110 opacity-0"
				/>
				{checked ? (
					<button onClick={toggleCheck} className="absolute z-10 top-1 left-0">
						<CheckBoxIcon />
					</button>
				) : (
					<button onClick={toggleCheck} className="absolute z-10 top-1 left-0">
						<UncheckedBoxIcon />
					</button>
				)}
			</span>
			<span
				contentEditable={!readOnly}
				suppressContentEditableWarning
				className="flex-1"
			>
				{children}
			</span>
		</div>
	);
};

export default CheckListElement;
