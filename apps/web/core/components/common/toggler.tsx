import { IClassName } from '@/core/types/interfaces/global/class-name';
import { clsxm } from '@/core/lib/utils';
import { Switch } from '@headlessui/react';
import { useTheme } from 'next-themes';
import React, { PropsWithChildren } from 'react';
import {
	MoonLightFillIcon as MoonDarkIcon,
	MoonLightOutlineIcon as MoonIcon,
	SunFillIcon as SunIcon,
	SunOutlineIcon as SunDarkIcon,
	CubeIcon as BoxIcon,
	TimerStopIcon
} from 'assets/svg';
import { Text } from './typography';
import { AllSidesIcon, Cross2Icon, LightningBoltIcon, UpdateIcon } from '@radix-ui/react-icons';
import { useAtom } from 'jotai';
import { dataSyncModeState, isDataSyncState } from '@/core/stores/common/data-sync';
import { useModal } from '@/core/hooks';
import { RealTimePopup } from '@/core/components/pages/settings/personal/sync.zone';
import { fullWidthState } from '@/core/stores/common/full-width';

type Props = {
	className?: string;
	onClickOne?: () => void;
	onClickTwo?: () => void;
	themeTogger?: boolean;
	firstBtnClassName?: string;
	secondBtnClassName?: string;
} & PropsWithChildren;

export function Toggler({ children, className, onClickOne, onClickTwo, firstBtnClassName, secondBtnClassName }: Props) {
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
		<Toggler className={className} onClickOne={() => setTheme('light')} onClickTwo={() => setTheme('dark')}>
			<>
				<SunDarkIcon className="hidden dark:inline-block h-[18px] w-[18px]" />
				<SunIcon className="dark:hidden inline-block h-[18px] w-[18px] text-[#382686]" />
			</>
			<>
				<MoonDarkIcon className="h-[18px] w-[18px] hidden text-white dark:inline-block " />
				<MoonIcon className="dark:hidden inline-block h-[18px] w-[18px]" />
			</>
		</Toggler>
	);
}

export function TreeModeToggler({ className }: IClassName) {
	return (
		<Toggler className={className} firstBtnClassName="dark:bg-[#3B4454]" secondBtnClassName="dark:bg-transparent">
			<TimerStopIcon className="dark:text-white w-full max-w-[20px]" />
			<BoxIcon className="h-6 w-6 text-[#7E7991] dark:text-[#969CA6]" strokeWidth="1.7" />
		</Toggler>
	);
}

export function DataSyncToggler({ className }: IClassName) {
	const [dataSync, setDataSync] = useAtom(isDataSyncState);

	React.useEffect(() => {
		window && window.localStorage.setItem('conf-is-data-sync', JSON.stringify(dataSync));
	}, [dataSync]);

	return (
		<div
			className={clsxm(
				'flex flex-row items-start bg-light--theme-dark dark:bg-[#1D222A] py-1 px-2 rounded-[60px] gap-[10px]',
				className
			)}
		>
			<button
				onClick={() => setDataSync(true)}
				className={clsxm(
					'flex flex-row justify-center items-center p-2 w-8 h-8 rounded-[60px] ml-[-2px]',
					dataSync && 'bg-white text-primary shadow-md dark:bg-transparent dark:bg-[#3B4454]'
				)}
			>
				<UpdateIcon className="dark:text-white" />
			</button>

			<button
				onClick={() => setDataSync(false)}
				className={clsxm(
					'flex flex-row justify-center items-center p-2 w-8 h-8 rounded-[60px] mr-[-2px]',
					!dataSync && 'bg-red-400 shadow-md dark:bg-transparent dark:bg-red-400'
				)}
			>
				<Cross2Icon className={clsxm(!dataSync && 'text-white')} />
			</button>
		</div>
	);
}

export function DataSyncModeToggler({ className }: IClassName) {
	const [dataSyncMode, setDataSyncMode] = useAtom(dataSyncModeState);
	const { isOpen, closeModal, openModal } = useModal();

	React.useEffect(() => {
		window && window.localStorage.setItem('conf-data-sync', JSON.stringify(dataSyncMode));
	}, [dataSyncMode]);

	return (
		<>
			<div
				className={clsxm(
					'flex flex-row items-start bg-light--theme-dark dark:bg-[#1D222A] py-1 px-2 rounded-[60px] gap-[10px]',
					className
				)}
			>
				<button
					onClick={() =>
						// setDataSyncMode('REAL_TIME')
						openModal()
					}
					className={clsxm(
						'flex flex-row justify-center items-center p-2 w-8 h-8 rounded-[60px] ml-[-2px]',
						dataSyncMode == 'REAL_TIME' &&
							'bg-white text-primary shadow-md dark:bg-transparent dark:bg-[#3B4454]'
					)}
				>
					<LightningBoltIcon className="dark:text-white" />
				</button>

				<button
					onClick={() => setDataSyncMode('PULL')}
					className={clsxm(
						'flex flex-row justify-center items-center p-2 w-8 h-8 rounded-[60px] mr-[-2px]',
						dataSyncMode == 'PULL' && 'bg-white shadow-md dark:bg-transparent dark:bg-[#3B4454]'
					)}
				>
					<UpdateIcon className="dark:text-white" />
				</button>
			</div>
			<RealTimePopup open={isOpen} closeModal={closeModal} />
		</>
	);
}

export function CommonToggle({
	enabledText = '',
	disabledText = '',
	enabled = false,
	disabled = false,
	onChange = () => {
		return;
	}
}: {
	enabledText: string | undefined;
	disabledText: string | undefined;
	enabled?: boolean;
	disabled?: boolean;
	onChange?: () => void;
}) {
	return (
		<div className="py-4 flex items-center gap-x-[10px]">
			<Switch
				disabled={disabled}
				checked={enabled}
				onChange={onChange}
				className={`${enabled ? 'bg-[#DBD3FA]' : 'bg-[#80808061]'}
          relative inline-flex h-[38px] w-[74px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2  focus-visible:ring-white focus-visible:ring-opacity-75`}
			>
				<span
					aria-hidden="true"
					className={`${enabled ? 'translate-x-9 bg-[#3826A6]' : 'translate-x-1'}
            pointer-events-none inline-block h-[30px] w-[30px] mt-[2.5px] transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out`}
				/>
			</Switch>
			<Text className="text-gray-400 text-md font-normal">{enabled ? enabledText : disabledText}</Text>
		</div>
	);
}

export function FullWidthToggler({ className }: IClassName) {
	const [fullWidth, setFullWidth] = useAtom(fullWidthState);

	React.useEffect(() => {
		window && window.localStorage.setItem('conf-fullWidth-mode', JSON.stringify(fullWidth));
	}, [fullWidth]);

	return (
		<div
			className={clsxm(
				'flex flex-row items-start bg-light--theme-dark dark:bg-[#1D222A] py-1 px-2 rounded-[60px] gap-[10px]',
				className
			)}
		>
			<button
				onClick={() => setFullWidth(true)}
				className={clsxm(
					'flex flex-row justify-center items-center p-2 w-8 h-8 rounded-[60px] ml-[-2px]',
					fullWidth && 'bg-white text-primary shadow-md dark:bg-transparent dark:bg-[#3B4454]'
				)}
			>
				<AllSidesIcon className="dark:text-white" />
			</button>

			<button
				onClick={() => setFullWidth(false)}
				className={clsxm(
					'flex flex-row justify-center items-center p-2 w-8 h-8 rounded-[60px] mr-[-2px]',
					!fullWidth && 'bg-red-400 shadow-md dark:bg-transparent dark:bg-red-400'
				)}
			>
				<Cross2Icon className={clsxm(!fullWidth && 'text-white')} />
			</button>
		</div>
	);
}
