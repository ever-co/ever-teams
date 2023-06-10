import { IClassName } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Switch } from '@headlessui/react';
import { useTheme } from 'next-themes';
import React, { PropsWithChildren, useCallback, useState } from 'react';
import {
	BoxIcon,
	MoonDarkIcon,
	MoonIcon,
	StopIcon,
	SunDarkIcon,
	SunIcon,
} from './svgs';
import { Text } from './typography';

type Props = {
	className?: string;
	onClickOne?: () => void;
	onClickTwo?: () => void;
	themeTogger?: boolean;
	firstBtnClassName?: string;
	secondBtnClassName?: string;
} & PropsWithChildren;

export function Toggler({
	children,
	className,
	onClickOne,
	onClickTwo,
	firstBtnClassName,
	secondBtnClassName,
}: Props) {
	const childrenArr = React.Children.toArray(children);

	return (
		<div
			className={clsxm(
				'flex flex-row items-start bg-light--theme-dark dark:bg-[#1D222A] py-1 px-2 rounded-[60px] gap-[10px]',
				className
			)}
		>
			<button
				onClick={onClickOne}
				className={clsxm(
					'flex flex-row justify-center items-center p-2 w-8 h-8 rounded-[60px] ml-[-2px]',
					'bg-white shadow-md dark:bg-transparent dark:shadow-none',
					firstBtnClassName
				)}
			>
				{childrenArr[0] || <></>}
			</button>

			<button
				onClick={onClickTwo}
				className={clsxm(
					'flex flex-row justify-center items-center p-2 w-8 h-8 rounded-[60px] mr-[-2px]',
					'dark:bg-[#3B4454]',
					secondBtnClassName
				)}
			>
				{childrenArr[1] || <></>}
			</button>
		</div>
	);
}

/**
 * Theme Toggler
 */
export function ThemeToggler({ className }: IClassName) {
	const { setTheme } = useTheme();

	return (
		<Toggler
			className={className}
			onClickOne={() => setTheme('light')}
			onClickTwo={() => setTheme('dark')}
		>
			<>
				<SunDarkIcon className="hidden dark:inline-block" />
				<SunIcon className="dark:hidden inline-block" />
			</>
			<>
				<MoonDarkIcon className="hidden dark:inline-block" />
				<MoonIcon className="dark:hidden inline-block" />
			</>
		</Toggler>
	);
}

export function TreeModeToggler({ className }: IClassName) {
	return (
		<Toggler
			className={className}
			firstBtnClassName="dark:bg-[#3B4454]"
			secondBtnClassName="dark:bg-transparent"
		>
			<StopIcon className="dark:stroke-white" />
			<BoxIcon className="stroke-[#7E7991] dark:stroke-[#969CA6]" />
		</Toggler>
	);
}

export function CommonToggle({
	enabledText = '',
	disabledText = '',
}: {
	enabledText: string | undefined;
	disabledText: string | undefined;
}) {
	const [enabled, setEnabled] = useState(true);

	const handleChange = useCallback(() => {
		setEnabled(!enabled);
	}, [enabled]);

	return (
		<div className="py-4 flex items-center gap-x-[10px]">
			<Switch
				checked={enabled}
				onChange={() => {
					handleChange();
				}}
				className={`${enabled ? 'bg-[#DBD3FA]' : 'bg-[#80808061]'}
          relative inline-flex h-[38px] w-[74px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2  focus-visible:ring-white focus-visible:ring-opacity-75`}
			>
				<span
					aria-hidden="true"
					className={`${
						enabled ? 'translate-x-9 bg-[#3826A6]' : 'translate-x-1'
					}
            pointer-events-none inline-block h-[30px] w-[30px] mt-[2.5px] transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out`}
				/>
			</Switch>
			<Text className="text-gray-400 text-md font-normal">
				{enabled ? enabledText : disabledText}
			</Text>
		</div>
	);
}
