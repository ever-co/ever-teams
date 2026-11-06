import { IClassName } from '@/core/types/interfaces/common/class-name';
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
import { LightningBoltIcon, UpdateIcon } from '@radix-ui/react-icons';
import { X } from '@/core/components/icons';
import { useAtom } from 'jotai';
import { dataSyncModeState, isDataSyncState } from '@/core/stores/common/data-sync';
import { writeStoredDataSyncMode } from '@/core/lib/utils/settings-data-sync';
import { useModal } from '@/core/hooks/common/use-modal';
import { RealTimePopup } from '@/core/components/pages/settings/personal/sync.zone';

const segmentRecipe =
	'flex size-8 flex-row items-center justify-center rounded-md p-2 text-muted-foreground transition-colors';

const activeSegmentRecipe = 'bg-primary/10 text-primary-ink hairline-ring ring-primary/30';

const commonToggleTrackRecipe =
	'group relative inline-flex h-6 w-10.5 shrink-0 cursor-pointer items-center rounded-full hairline-border border-transparent bg-foreground/10 p-0.5 shadow-sm shadow-black/10 hairline-ring ring-foreground/10 outline-none transition-[color,box-shadow,background-color] focus-visible:ring-[3px] focus-visible:ring-ring/25 data-checked:bg-primary data-disabled:cursor-not-allowed data-disabled:opacity-50 dark:ring-foreground/15';

const commonToggleThumbRecipe =
	'pointer-events-none block size-4.5 rounded-full bg-white shadow-sm shadow-black/15 transition-transform duration-200 group-data-checked:translate-x-4.5';

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
		<div className={clsxm('flex flex-row items-center gap-1 rounded-lg bg-foreground/5 p-1', className)}>
			<button
				onClick={onClickOne}
				className={clsxm(
					segmentRecipe,
					activeSegmentRecipe,
					'dark:bg-transparent dark:text-muted-foreground dark:ring-0',
					firstBtnClassName
				)}
			>
				{childrenArr[0] || <></>}
			</button>

			<button
				onClick={onClickTwo}
				className={clsxm(
					segmentRecipe,
					'dark:bg-primary/10 dark:text-primary-ink dark:hairline-ring dark:ring-primary/30',
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
				<SunIcon className="dark:hidden inline-block h-[18px] w-[18px]" />
			</>
			<>
				<MoonDarkIcon className="h-[18px] w-[18px] hidden dark:inline-block" />
				<MoonIcon className="dark:hidden inline-block h-[18px] w-[18px]" />
			</>
		</Toggler>
	);
}

export function TreeModeToggler({ className }: IClassName) {
	return (
		<Toggler
			className={className}
			firstBtnClassName="dark:bg-primary/10 dark:text-primary-ink dark:hairline-ring dark:ring-primary/30"
			secondBtnClassName="dark:bg-transparent dark:text-muted-foreground dark:ring-0"
		>
			<TimerStopIcon className="w-full max-w-[20px]" />
			<BoxIcon className="h-6 w-6" strokeWidth="1.7" />
		</Toggler>
	);
}

export function DataSyncToggler({ className }: IClassName) {
	const [dataSync, setDataSync] = useAtom(isDataSyncState);

	React.useEffect(() => {
		window && window.localStorage.setItem('conf-is-data-sync', JSON.stringify(dataSync));
	}, [dataSync]);

	return (
		<div className={clsxm('flex flex-row items-center gap-1 rounded-lg bg-foreground/5 p-1', className)}>
			<button onClick={() => setDataSync(true)} className={clsxm(segmentRecipe, dataSync && activeSegmentRecipe)}>
				<UpdateIcon />
			</button>

			<button
				onClick={() => setDataSync(false)}
				className={clsxm(
					segmentRecipe,
					!dataSync && 'bg-destructive/10 text-destructive-ink hairline-ring ring-destructive/30'
				)}
			>
				<X className="size-4" />
			</button>
		</div>
	);
}

export function DataSyncModeToggler({ className }: IClassName) {
	const [dataSyncMode, setDataSyncMode] = useAtom(dataSyncModeState);
	const { isOpen, closeModal, openModal } = useModal();

	React.useEffect(() => {
		writeStoredDataSyncMode(window.localStorage, dataSyncMode);
	}, [dataSyncMode]);

	return (
		<>
			<div className={clsxm('flex flex-row items-center gap-1 rounded-lg bg-foreground/5 p-1', className)}>
				<button
					onClick={() =>
						// setDataSyncMode('REAL_TIME')
						openModal()
					}
					className={clsxm(segmentRecipe, dataSyncMode == 'REAL_TIME' && activeSegmentRecipe)}
				>
					<LightningBoltIcon />
				</button>

				<button
					onClick={() => setDataSyncMode('PULL')}
					className={clsxm(segmentRecipe, dataSyncMode == 'PULL' && activeSegmentRecipe)}
				>
					<UpdateIcon />
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
		<div className="py-4 flex items-center gap-x-2.5">
			<Switch disabled={disabled} checked={enabled} onChange={onChange} className={commonToggleTrackRecipe}>
				<span aria-hidden="true" className={commonToggleThumbRecipe} />
			</Switch>
			<Text className="text-sm text-muted-foreground">{enabled ? enabledText : disabledText}</Text>
		</div>
	);
}
