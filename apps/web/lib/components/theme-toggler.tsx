import clsxm from '@app/utils/clsxm';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { MoonIcon, SunIcon, SunDarkIcon, MoonDarkIcon } from './svgs';

export function ThemeToggler() {
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
		<div className="flex flex-row items-start bg-light--theme-dark dark:bg-[#1D222A] py-1 px-2 rounded-[60px] gap-[10px]">
			<button
				onClick={() => setTheme('light')}
				className={clsxm(
					'flex flex-row justify-center items-center p-2 w-8 h-8 rounded-[60px] ml-[-2px]',
					theme === 'light' ? 'bg-white shadow-md' : ''
				)}
			>
				{theme === 'dark' && <SunDarkIcon />}
				{theme === 'light' && <SunIcon />}
			</button>

			<button
				onClick={() => setTheme('dark')}
				className={clsxm(
					'flex flex-row justify-center items-center p-2 w-8 h-8 rounded-[60px] mr-[-2px]',
					theme === 'dark' ? 'bg-[#3B4454]' : ''
				)}
			>
				{theme === 'dark' && <MoonDarkIcon />}
				{theme === 'light' && <MoonIcon />}
			</button>
		</div>
	);
}
