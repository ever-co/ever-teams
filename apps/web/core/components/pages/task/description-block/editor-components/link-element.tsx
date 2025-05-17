import { useSelected, useFocused, useSlateStatic } from 'slate-react';

import { removeLink } from '../../../../../lib/helpers/text-editor-service';
import { useEffect, useRef, useState } from 'react';
import { ExternalLinkIcon, UnlinkRoundIcon } from 'assets/svg';

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
				href={element?.href}
				onClick={handleVisibility}
			>
				{children}
			</a>
			{selected && focused && visible && (
				<div
					className="absolute left-0 flex items-center max-w-xs bg-white dark:bg-dark--theme-light p-2 gap-1 rounded-md border border-gray-300 dark:border-[#7B8089] z-10 "
					contentEditable="false"
				>
					<div className="flex items-center pr-2 text-xs border-r dark:bg-dark--theme-light border-gray-300">
						<ExternalLinkIcon className="h-[18px]  w-[18px] mr-1" />
						<a
							href={href}
							rel="noreferrer"
							target="_blank"
							className=" text-[#5000B9] dark:text-primary-light truncate max-w-[230px] overflow-hidden whitespace-nowrap mr-0"
							style={{ textOverflow: 'ellipsis' }}
						>
							{element.href}
						</a>
					</div>
					<button
						onClick={() => removeLink(editor)}
						className="border-none bg-transparent hover:cursor-pointer ml-0 "
					>
						<UnlinkRoundIcon className="h-4 w-4 text-black dark:text-white" />
					</button>
				</div>
			)}
		</div>
	);
};

export default LinkElement;
