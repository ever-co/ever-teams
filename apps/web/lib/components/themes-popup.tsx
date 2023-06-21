import { Switch } from '@headlessui/react';
import React from 'react';

import Image from 'next/image';
import type { StaticImageData } from 'next/image';

interface IThemesPopup {
	theme: string;
	currentTheme: string | undefined;
	text: string;
	image: StaticImageData;
	enabled: boolean;
	index: number;
	setTheme: (theme: string) => void;
}

const ThemesPopup = ({
	theme,
	currentTheme,
	text,
	image,
	enabled,
	setTheme,
	index,
}: IThemesPopup) => {
	return (
		<div
			onClick={() => setTheme(theme)}
			className="bg-light--theme-dark dark:bg-dark--theme-light font-normal text-sm rounded-lg"
		>
			<div className="flex justify-between my-4 px-4">
				<h3 className="font-medium">{text}</h3>
				<Switch
					checked={enabled}
					onChange={() => setTheme(theme)}
					className={`${
						enabled ? 'bg-primary dark:bg-primary-light' : 'bg-gray-300'
					} relative inline-flex h-4 w-7 items-center rounded-full`}
				>
					<span className="sr-only">Set Theme</span>
					<span
						className={`${
							enabled ? 'translate-x-3' : 'translate-x-1'
						} inline-block h-3 w-3 transform rounded-full bg-white transition`}
					/>
				</Switch>
			</div>
			<div className="flex justify-center overflow-hidden rounded-lg">
				<Image
					src={image}
					alt="theme"
					width={290}
					className=""
					style={
						currentTheme === 'light' && index === 0
							? { boxShadow: '5px 20px 25px rgba(0,0,0,0.18)' }
							: currentTheme === 'light' && index > 0
							? { boxShadow: '7px 20px 25px rgba(0,0,0,0.5)' }
							: {}
					}
				/>
			</div>
		</div>
	);
};

export default ThemesPopup;
