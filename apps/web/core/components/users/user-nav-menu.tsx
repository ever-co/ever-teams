/* eslint-disable no-mixed-spaces-and-tabs */
import { CHARACTER_LIMIT_TO_SHOW } from '@/core/constants/config/constants';
import { imgTitle } from '@/core/lib/helpers/index';
import { useAuthenticateUser, useOrganizationTeams, useTimer } from '@/core/hooks';
import { publicState } from '@/core/stores';
import { clsxm, isValidUrl } from '@/core/lib/utils';
import { Popover, PopoverButton, PopoverPanel, Transition } from '@headlessui/react';
import { Divider, FullWidthToggler, Text, ThemeToggler } from '@/core/components';

import {
	DevicesIcon,
	LogoutRoundIcon,
	MoonLightOutlineIcon as MoonIcon,
	PeoplesIcon,
	BriefCaseIcon,
	SettingOutlineIcon,
	FullWidthIcon
} from 'assets/svg';
import ThemesPopup from '@/core/components/common/themes-popup';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import stc from 'string-to-color';
import gauzyDark from '@/public/assets/themeImages/gauzyDark.png';
import gauzyLight from '@/public/assets/themeImages/gauzyLight.png';
import { TimerStatus, getTimerStatusValue } from '../timer/timer-status';
import Collaborate from '@/core/components/collaborate';
import { TeamsDropDown } from '../teams/teams-dropdown';
import { KeyboardShortcuts } from '@/core/components/common/keyboard-shortcuts';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ChevronDown, Globe2Icon } from 'lucide-react';
import { LanguageDropDownWithFlags } from '@/core/components/common/language-dropdown-flags';
import { signOutFunction } from '@/core/lib/helpers/social-logins';
import { Avatar } from '../duplicated-components/avatar';
import { EverCard } from '../common/ever-card';
import { Tooltip } from '../duplicated-components/tooltip';
import { ETimerStatus } from '@/core/types/generics/enums/timer';
import { ThemeInterface } from '@/core/types/interfaces/common/theme';

export function UserNavAvatar() {
	const { user } = useAuthenticateUser();
	const imageUrl = user?.image?.thumbUrl || user?.image?.fullUrl || user?.imageUrl;
	const name = user?.name || user?.firstName || user?.lastName || user?.username || '';
	const { timerStatus } = useTimer();
	const { activeTeam } = useOrganizationTeams();
	const publicTeam = useAtomValue(publicState);
	const members = activeTeam?.members || [];
	const currentMember = members.find((m) => {
		return m.employee?.userId === user?.id;
	});
	const timerStatusValue: ETimerStatus = useMemo(() => {
		return getTimerStatusValue(timerStatus, currentMember, publicTeam);
	}, [timerStatus, currentMember, publicTeam]);

	return (
		<Popover className="relative z-[60] flex items-center">
			<PopoverButton className="outline-none">
				<div
					className={clsxm(
						'size-12',
						'flex justify-center items-center',
						'rounded-full text-white',
						'shadow-md text-[2.063rem] dark:text-[1.75rem] text-thin font-PlusJakartaSans '
					)}
					style={{
						backgroundColor: `${stc(name || '')}80`
					}}
				>
					{imageUrl && isValidUrl(imageUrl) ? (
						<Avatar
							size={48}
							className="relative cursor-pointer dark:border-[0.25rem] dark:border-[#26272C]"
							imageUrl={imageUrl}
							alt="Team Avatar"
							imageTitle={name}
						>
							<TimerStatus
								status={timerStatusValue}
								className="size-[1.3rem] absolute bottom-3 -right-2 -mb-4 border-[0.125rem] border-white dark:border-[#26272C]"
								tooltipClassName="mt-10"
							/>
						</Avatar>
					) : name ? (
						<div className="size-12 flex justify-center items-center relative rounded-full dark:border-[0.25rem] dark:border-[#26272C] text-white">
							{imgTitle(name).charAt(0)}
							<TimerStatus
								status={timerStatusValue}
								className="size-[1.3rem] absolute bottom-3 -right-2 -mb-4 border-[0.125rem] border-white dark:border-[#26272C]"
								tooltipClassName="mt-8"
								labelContainerClassName="mr-8"
							/>
						</div>
					) : (
						''
					)}
				</div>
			</PopoverButton>

			<Transition
				enter="transition duration-100 ease-out"
				enterFrom="transform scale-95 opacity-0"
				enterTo="transform scale-100 opacity-100"
				leave="transition duration-75 ease-out"
				leaveFrom="transform scale-100 opacity-100"
				leaveTo="transform scale-95 opacity-0"
			>
				<PopoverPanel className="absolute right-0 z-[60] top-12 xl:-right-5">
					<MenuIndicator />
					<UserNavMenu />
				</PopoverPanel>
			</Transition>
		</Popover>
	);
}

function MenuIndicator() {
	return (
		<EverCard
			className={clsxm(
				'absolute right-0 top-4 bg-transparent -z-10 dark:bg-transparent',
				'nav-items--shadow rounded-none !py-0 !px-0',
				'w-0 h-0',
				'border-l-[15px] border-r-[15px]',
				'xl:border-l-[35px] border-l-transparent xl:border-r-[35px] border-r-transparent',
				'border-solid border-b-light--theme-light dark:border-b-dark--theme-light border-b-[50px]'
			)}
			shadow="custom"
		/>
	);
}

function UserNavMenu() {
	const { user, logOut } = useAuthenticateUser();
	const t = useTranslations();
	const imageUrl = user?.image?.thumbUrl || user?.image?.fullUrl || user?.imageUrl;
	const name = user?.name || user?.firstName || user?.lastName || user?.username;
	const { timerStatus } = useTimer();
	const { activeTeam, isTeamMember } = useOrganizationTeams();
	const publicTeam = useAtomValue(publicState);

	const members = activeTeam?.members || [];
	const currentMember = members.find((m) => {
		return m.employee?.userId === user?.id;
	});

	const pathname = usePathname();

	const isTeamDropdownAllowed = useMemo(() => {
		if (!pathname) {
			return false;
		}

		const notAllowedList = ['/task/[id]', '/profile/[memberId]'];
		return !notAllowedList.includes(pathname);
	}, [pathname]);

	const timerStatusValue: ETimerStatus = useMemo(() => {
		return getTimerStatusValue(timerStatus, currentMember, publicTeam);
	}, [timerStatus, currentMember, publicTeam]);

	return (
		<EverCard
			shadow="custom"
			className="w-[308px relative flex flex-col nav-items--shadow z-10 shadow-darker dark:bg-[#1B1D22] border dark:border-[#26272C]"
		>
			<div className="flex flex-col justify-center items-center">
				<Link href={`/settings/personal`}>
					<div
						className={clsxm(
							'w-[72px] h-[72px]',
							'flex relative justify-center items-center',
							'text-xs text-white rounded-full',
							'relative mb-5 text-5xl font-thin shadow-md cursor-pointer font-PlusJakartaSans'
						)}
						style={{
							backgroundColor: `${stc(name || '')}80`
						}}
					>
						{imageUrl && isValidUrl(imageUrl) ? (
							<Avatar size={72} className="relative cursor-pointer" imageUrl={imageUrl} alt="Team Avatar">
								<TimerStatus
									status={timerStatusValue}
									className="w-[1.3rem] h-[1.3rem] absolute z-20 bottom-3 -right-1 -mb-3 border-[0.125rem] border-white dark:border-[#26272C]"
									tooltipClassName="mt-10"
								/>
							</Avatar>
						) : name ? (
							<div className="relative w-[72px] h-[72px] flex justify-center items-center">
								{imgTitle(name).charAt(0)}
								<TimerStatus
									status={timerStatusValue}
									className="w-[1.3rem] h-[1.3rem] absolute z-20 bottom-3 -right-1 -mb-3 border-[0.125rem] border-white dark:border-[#26272C]"
									tooltipClassName="mt-2 "
									labelContainerClassName="mr-14"
								/>
							</div>
						) : (
							''
						)}
					</div>
				</Link>
				<Link href={`/settings/personal`} className="w-full text-center">
					<Tooltip
						label={`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || ''}
						enabled={
							`${user?.firstName || ''} ${user?.lastName || ''}`.trim().length > CHARACTER_LIMIT_TO_SHOW
						}
						placement="auto"
					>
						<Text.Heading as="h3" className="overflow-hidden whitespace-nowrap text-ellipsis">
							{user?.firstName} {user?.lastName}
						</Text.Heading>
					</Tooltip>

					<Tooltip
						label={user?.email || ''}
						enabled={`${user?.email}`.trim().length > CHARACTER_LIMIT_TO_SHOW}
						placement="auto"
					>
						<Text className="text-sm overflow-hidden text-ellipsis whitespace-nowrap text-[#7E7991]">
							{user?.email}
						</Text>
					</Tooltip>
				</Link>
				<Divider className="mt-6" />
				<ul className="mt-4 w-full">
					{/* Task menu */}
					<li className="flex items-center h-10">
						<Link
							href={`/profile/${user?.id}?name=${name || ''}`}
							className="flex items-center space-x-3 font-normal text-center"
						>
							<BriefCaseIcon className="w-5 h-5" strokeWidth="1.7" /> <span>{t('common.MY_TASKS')}</span>
						</Link>
					</li>
					{/* Team menu */}
					<li className="flex items-center h-10">
						<Link href="/" className="flex items-center space-x-3 font-normal">
							<PeoplesIcon strokeWidth="1.7" className="w-5 h-5 stroke-default dark:stroke-white" />{' '}
							<span>{t('common.MY_TEAM')}</span>
						</Link>
					</li>
					{/* Settings menu */}

					<li className="flex items-center h-10">
						<Link href={'/settings/personal'} className="flex items-center space-x-3 font-normal">
							<SettingOutlineIcon strokeWidth="1.7" className="w-5 h-5" />{' '}
							<span>{t('common.SETTINGS')}</span>
						</Link>
					</li>

					{/* fullWidth menu */}
					<li className="flex justify-between items-center space-x-3 h-10 font-normal">
						<div className="flex flex-1 items-center space-x-3 font-normal">
							<FullWidthIcon strokeWidth="1.7" className="w-5 h-5" />{' '}
							<span>{t('common.FULL_WIDTH')}</span>
						</div>
						<FullWidthToggler className="scale-75" />
					</li>

					{/* Darkmode menu */}
					<li className="flex justify-between items-center mb-1 space-x-3 h-10 font-normal">
						<div className="flex flex-1 items-center space-x-3">
							<MoonIcon strokeWidth="1.3" className="w-5 h-5" /> <span>{t('common.DARK_MODE')}</span>
						</div>
						<ThemeToggler className="scale-75" />
					</li>
					<li className="flex justify-between items-center space-x-3 h-10 font-normal">
						<div className="flex flex-1 items-center space-x-3">
							<Globe2Icon className="w-5 h-5" strokeWidth="1.7" /> <span>{t('common.LANGUAGE')}</span>
						</div>
						<LanguageDropDownWithFlags
							showFlag={false}
							btnClassName="dark:bg-transparent border-none flex items-center justify-end w-[120px]"
						/>
					</li>

					{/* 3D Mode menu */}
					{/* TODO
					- Uncomment it when we have 3D mode ready
					*/}
					{/* <li className="flex items-center space-x-3 font-normal">
						<div className="flex flex-1 items-center space-x-3">
							<BoxIcon className="w-5 h-5" />{' '}
							<span>{trans.common['3D_MODE']}</span>
						</div>
						<TreeModeToggler className="scale-75" />
					</li> */}

					{/* Themes menu */}
					<li className="flex justify-between items-center pr-3 space-x-3 w-full h-10 font-normal">
						<div className="flex flex-1 space-x-3">
							<DevicesIcon strokeWidth="1.7" className="w-5 h-5" /> <span>{t('common.THEMES')}</span>
						</div>

						<ThemeDropdown />
					</li>
				</ul>
				<Divider className="mt-4" />
				<ul className="flex flex-col gap-2 justify-start items-center md:hidden">
					{!publicTeam && <Collaborate />}

					{isTeamMember && isTeamDropdownAllowed ? <TeamsDropDown publicTeam={publicTeam || false} /> : null}

					<KeyboardShortcuts />
					<Divider className="mt-1 mb-3 w-full" />
				</ul>
				<ul className="py-4 w-full">
					{/* Logout menu */}
					<li>
						<button
							className="flex space-x-3 items-center font-normal text-[#DE437B]"
							onClick={() => {
								logOut();
								signOutFunction();
							}}
						>
							<LogoutRoundIcon className="w-5 h-5 stroke-[#DE437B]" /> <span>{t('common.LOGOUT')}</span>
						</button>
					</li>
				</ul>
			</div>
			<div className="w-8 h-8 bg-inherit border-inherit rounded-none border shadow-inherit absolute [clip-path:polygon(0%_0%,100%_100%,_0%_100%)] -top-[0.95rem] right-8 rotate-[135deg] rounded-bl-md" />
		</EverCard>
	);
}

function ThemeDropdown() {
	const { theme, setTheme } = useTheme();

	const themes: ThemeInterface[] = [
		{
			theme: 'light',
			text: 'Gauzy Light 2D',
			image: gauzyLight,
			enabled: theme === 'light'
		},
		{
			theme: 'dark',
			text: 'Gauzy Dark 2D',
			image: gauzyDark,
			enabled: theme === 'dark'
		}
	];

	const selectedThemeText = themes.find((item: ThemeInterface): boolean => item.theme === theme)?.text;

	return (
		<Popover className="flex relative z-30 items-center h-full">
			<PopoverButton className="flex items-center h-full text-sm font-light">
				<p className="text-sm text-neutral">{selectedThemeText?.replace('2D', '')}</p>
				<ChevronDown className="ml-2 w-4 h-4 opacity-50" />
			</PopoverButton>
			<Transition
				enter="transition duration-100 ease-out"
				enterFrom="transform scale-95 opacity-0"
				enterTo="transform scale-100 opacity-100"
				leave="transition duration-75 ease-out"
				leaveFrom="transform scale-100 opacity-100"
				leaveTo="transform scale-95 opacity-0"
			>
				<PopoverPanel className="theme-popup-scrollbar absolute z-10 max-w-sm w-[360px] right-[-25px] rounded-xl top-[-50px] shadow-xl p-0">
					<EverCard
						shadow="bigger"
						className="flex flex-col !px-5 !py-3 !overflow-auto h-[15.5rem] 3xl:h-auto gap-4"
					>
						{themes.map((item: ThemeInterface, index: number) => (
							<ThemesPopup
								currentTheme={theme}
								key={index}
								index={index}
								theme={item.theme}
								text={item.text}
								image={item.image}
								enabled={item.enabled}
								setTheme={setTheme}
							/>
						))}
					</EverCard>
				</PopoverPanel>
			</Transition>
		</Popover>
	);
}

// function ThemeDropdown() {
// 	const { theme, setTheme } = useTheme();

// 	const themes = {
// 		dark: 'Gauzy Dark',
// 		light: 'Gauzy light',
// 	};

// 	const selected = themes[theme as keyof typeof themes];

// 	return (
// 		<div className="relative">
// 			<Listbox value={selected} onChange={setTheme as any}>
// 				<Listbox.Button className="flex items-center text-sm text-gray-500 dark:text-gray-300">
// 					{selected}{' '}
// 					<ChevronDownIcon
// 						className={clsxm(
// 							'ml-2 w-5 h-5 transition duration-150 ease-in-out dark:text-white group-hover:text-opacity-80'
// 						)}
// 						aria-hidden="true"
// 					/>
// 				</Listbox.Button>
// 				<Listbox.Options className={'flex absolute inset-0 flex-col mt-6'}>
// 					<EverCard className="!p-0" shadow="custom">
// 						{Object.keys(themes).map((key) => (
// 							<Listbox.Option
// 								key={key}
// 								value={key}
// 								className="text-sm text-gray-600 cursor-pointer dark:text-white"
// 							>
// 								{themes[key as keyof typeof themes]}
// 							</Listbox.Option>
// 						))}
// 					</EverCard>
// 				</Listbox.Options>
// 			</Listbox>
// 		</div>
// 	);
// }
