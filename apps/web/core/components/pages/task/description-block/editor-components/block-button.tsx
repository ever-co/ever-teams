import { clsxm } from '@/core/lib/utils';
import { TextEditorService } from '../../../../../lib/helpers/text-editor-service';
import { useMemo } from 'react';
import { useSlate } from 'slate-react';

interface IMarkButtonProps {
	format: string;
	icon: any;
	isBlockActive: (editor: any, format: any, blockType?: string) => boolean;
	className?: string;
}

const TEXT_ALIGN_TYPES = ['left', 'center', 'right', 'justify'];
const LIST_TYPES = ['ol', 'ul'];

const BlockButton = ({ format, icon: Icon, isBlockActive, className }: IMarkButtonProps) => {
	const editor = useSlate();

	const isBlockActiveMemo = useMemo(() => {
		return (
			isBlockActive &&
			((format: string) => {
				return isBlockActive(editor, format, TEXT_ALIGN_TYPES.includes(format) ? 'align' : 'type');
			})
		);
	}, [editor, isBlockActive]);

	return (
		<button
			className={clsxm(
				className,
				'my-1 rounded-md transition duration-300 p-[2px]',
				isBlockActiveMemo(format) ? 'dark:bg-[#47484D] bg-[#ddd]' : 'bg-transparent'
			)}
			onMouseDown={(event) => {
				event.preventDefault();
				TextEditorService.toggleBlock(editor, format, isBlockActive, LIST_TYPES, TEXT_ALIGN_TYPES);
			}}
		>
			<Icon className="h-5 w-5" />
		</button>
	);
};
export default BlockButton;
