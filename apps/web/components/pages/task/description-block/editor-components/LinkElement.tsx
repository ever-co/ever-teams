import { useSelected, useFocused, useSlateStatic } from 'slate-react';
import { ExternalLinkIcon, UnlinkIcon } from 'lib/components/svgs';

import { removeLink } from '../editor-components/TextEditorService';

const LinkElement = ({ attributes, element, children }: any) => {
	const editor = useSlateStatic();
	const selected = useSelected();
	const focused = useFocused();

	return (
		<div className="element-link inline relative">
			<a {...attributes} href={element.href}>
				{children}
			</a>
			{selected && focused && (
				<div
					className="absolute left-0 flex items-center bg-white p-2 gap-3 rounded-md border border-gray-300"
					contentEditable="false"
				>
					<a
						href={element.href}
						rel="noreferrer"
						target="_blank"
						className="flex items-center gap-1 pr-2 border-r border-gray-300"
					>
						<ExternalLinkIcon />
						{element.href}
					</a>
					<button
						onClick={() => removeLink(editor)}
						className="border-none bg-transparent hover:text-regal-blue hover:cursor-pointer"
					>
						<UnlinkIcon />
					</button>
				</div>
			)}
		</div>
	);
};

export default LinkElement;
