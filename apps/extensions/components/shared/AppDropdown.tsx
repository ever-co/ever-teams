import classNames from 'classnames';
import React, { useRef, useState, type FC } from 'react';

import useOnClickOutside from '~hooks/useOnClickOutside';
import { inheritTextSize, textEllipsis } from '~misc/tailwindClasses';

export interface IOption {
	id: string;
	title: string;
}

interface IAppDropdownProps {
	buttonClassNames: string;
	buttonTitle: string;
	buttonLabel?: string;
	options: IOption[];
	selectedId?: string | null;
	onOptionSelect: (option: IOption) => void;
	optionContainerClassNames?: string;
	disabled?: boolean;
}

export const AppDropdown: FC<IAppDropdownProps> = ({
	buttonClassNames,
	buttonTitle,
	buttonLabel,
	options,
	selectedId,
	onOptionSelect,
	optionContainerClassNames = '',
	disabled = false
}) => {
	const ref = useRef<HTMLDivElement>(null);
	const [dropdownHidden, setHidden] = useState<boolean>(true);

	useOnClickOutside(ref, () => setHidden(true));

	const selectOption = (option: IOption) => {
		setHidden(true);
		onOptionSelect(option);
	};

	const optionElements = options.map((option) => {
		const isSelected = option.id === selectedId;
		return (
			<li key={option.id} role="option" aria-selected={isSelected}>
				<button
					type="button"
					onClick={() => selectOption(option)}
					className={classNames(
						'block w-full rounded-md px-2 py-1.5 text-start text-sm hover:bg-zinc-900/5 focus-visible:bg-zinc-900/5 focus-visible:outline-none dark:hover:bg-white/10 dark:focus-visible:bg-white/10',
						textEllipsis,
						isSelected && 'font-medium'
					)}
				>
					{option.title}
				</button>
			</li>
		);
	});

	return (
		<div ref={ref} className="relative">
			<button
				type="button"
				aria-haspopup="listbox"
				aria-expanded={!dropdownHidden}
				aria-label={buttonLabel}
				disabled={disabled}
				className={classNames('inline-flex items-center justify-between', buttonClassNames)}
				onClick={() => setHidden((prev) => !prev)}
			>
				<span className={classNames(textEllipsis, inheritTextSize)}>{buttonTitle}</span>
				{svgCaret}
			</button>
			<div
				className={classNames(
					'scrollbar absolute right-0 z-10 mt-1.5 max-h-64 w-48 overflow-auto rounded-xl bg-white p-1 shadow-md shadow-black/10 ring-1 ring-zinc-900/10 dark:bg-zinc-800 dark:ring-white/10',
					dropdownHidden && 'hidden',
					optionContainerClassNames
				)}
			>
				<ul role="listbox" className="text-zinc-700 dark:text-zinc-200">
					{optionElements}
				</ul>
			</div>
		</div>
	);
};

const svgCaret = (
	<svg
		className="ml-2 h-4 w-4 min-w-[16px] opacity-60"
		aria-hidden="true"
		fill="none"
		stroke="currentColor"
		viewBox="0 0 24 24"
		xmlns="http://www.w3.org/2000/svg"
	>
		<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
	</svg>
);

export default AppDropdown;
