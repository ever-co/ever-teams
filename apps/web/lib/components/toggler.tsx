import { useHasMounted } from '@app/hooks';
import { IClassName } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { useTheme } from 'next-themes';
import React, { PropsWithChildren, useEffect, useState } from 'react';
import {
	BoxIcon,
	MoonDarkIcon,
	MoonIcon,
	StopIcon,
	SunDarkIcon,
	SunIcon,
} from './svgs';

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
	const { mounted } = useHasMounted();

	if (!mounted) {
		return <></>;
	}

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
	const { theme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	// useEffect only runs on the client, so now we can safely show the UI
	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return <></>;
	}

	return (
		<Toggler
			className={className}
			onClickOne={() => setTheme('light')}
			onClickTwo={() => setTheme('dark')}
		>
			<>
				{theme === 'dark' && <SunDarkIcon />}
				{theme === 'light' && <SunIcon />}
			</>
			<>
				{theme === 'dark' && <MoonDarkIcon />}
				{theme === 'light' && <MoonIcon />}
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
