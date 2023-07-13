import { useSelected, useFocused, useSlateStatic } from 'slate-react';
import { ExternalLinkIcon, UnlinkIcon } from 'lib/components/svgs';

import { removeLink } from '../editor-components/TextEditorService';
import { useEffect, useRef, useState } from 'react';

const LinkElement = ({ attributes, element, children }: any) => {
	const editor = useSlateStatic();
	const selected = useSelected();
	const focused = useFocused();

	const anchorRef = useRef<any>(null);

	const [visible, setVisible] = useState(false);

	const handleVisibility = (): void => {
		setVisible(!visible);
	};

	useEffect(() => {
		const onClickOutsideOfAnchor = (event: MouseEvent) => {
			if (anchorRef.current && !anchorRef.current.contains(event.target)) {
				setVisible(false);
			}
		};

		window.addEventListener('click', onClickOutsideOfAnchor);

		return () => window.removeEventListener('click', onClickOutsideOfAnchor);
	}, []);

	const href = `https://${element?.href?.replace('https://', '')}`;

	return (
		<div className="inline relative">
			<a
				className="text-[#5000B9] dark:text-primary-xlight"
				{...attributes}
				ref={anchorRef}
				href={element.href}
				onClick={handleVisibility}
			>
				{children}
			</a>
			{selected && focused && visible && (
				<div
					className="absolute left-0 flex items-center bg-white p-2 gap-1 rounded-md border border-gray-300"
					contentEditable="false"
				>
					<a
						href={href}
						rel="noreferrer"
						target="_blank"
						className="flex items-center gap-1 pr-2 border-r border-gray-300 text-[#5000B9] dark:text-primary-light"
					>
						<ExternalLinkIcon />
						{element.href}
					</a>
					<button
						onClick={() => removeLink(editor)}
						className="border-none bg-transparent hover:cursor-pointer ml-0"
					>
						<UnlinkIcon />
					</button>
				</div>
			)}
		</div>
	);
};

export default LinkElement;
