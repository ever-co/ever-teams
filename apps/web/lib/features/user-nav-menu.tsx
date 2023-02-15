import { CHARACTER_LIMIT_TO_SHOW } from '@app/constants';
import { useAuthenticateUser } from '@app/hooks';
import { clsxm } from '@app/utils';
import { Listbox, Popover, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import {
	Avatar,
	Card,
	Divider,
	Text,
	ThemeToggler,
	TreeModeToggler,
	Tooltip,
} from 'lib/components';
import {
	BoxIcon,
	BriefcaseIcon,
	DevicesIcon,
	LogoutIcon,
	MoonIcon,
	PeopleIcon,
	SettingsOutlineIcon,
} from 'lib/components/svgs';
import { useTranslation } from 'lib/i18n';
import { useTheme } from 'next-themes';
import Link from 'next/link';

export function UserNavAvatar() {
	const { user } = useAuthenticateUser();

	return (
		<Popover className="relative">
			<Popover.Button className="outline-none">
				<Avatar
					size={35}
					className="relative cursor-pointer"
					imageUrl={user?.imageUrl}
					alt={user?.firstName || undefined}
				/>
			</Popover.Button>

			<Transition
				enter="transition duration-100 ease-out"
				enterFrom="transform scale-95 opacity-0"
				enterTo="transform scale-100 opacity-100"
				leave="transition duration-75 ease-out"
				leaveFrom="transform scale-100 opacity-100"
				leaveTo="transform scale-95 opacity-0"
			>
				<Popover.Panel className="absolute z-50 right-0 xl:-right-5 mt-5">
					<MenuIndicator />
					<UserNavMenu />
				</Popover.Panel>
			</Transition>
		</Popover>
	);
}

function MenuIndicator() {
	return (
		<Card
			className={clsxm(
				'absolute -top-4 right-0 -z-10 bg-transparent dark:bg-transparent',
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
	const { trans } = useTranslation();

	return (
		<Card
			shadow="custom"
			className="w-[308px] p-5 flex flex-col nav-items--shadow z-10 rounded-[10px] shadow-xlcard"
		>
			<div className="flex flex-col justify-center items-center">
				<Link href={`/settings/personal`}>
					<Avatar
						size={72}
						className="relative cursor-pointer mb-5"
						imageUrl={user?.imageUrl}
						alt={user?.firstName || undefined}
					/>
				</Link>

				<Link href={`/settings/personal`} className="text-center  w-full">
					<Tooltip
						label={
							`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || ''
						}
						enabled={
							`${user?.firstName || ''} ${user?.lastName || ''}`.trim().length >
							CHARACTER_LIMIT_TO_SHOW
						}
						placement="auto"
					>
						<Text.Heading
							as="h3"
							className="overflow-hidden text-ellipsis whitespace-nowrap"
						>
							{user?.firstName} {user?.lastName}
						</Text.Heading>
					</Tooltip>

					<Tooltip
						label={user?.email || ''}
						enabled={`${user?.email}`.trim().length > CHARACTER_LIMIT_TO_SHOW}
						placement="auto"
					>
						<Text className="text-sm overflow-hidden text-ellipsis whitespace-nowrap">
							{user?.email}
						</Text>
					</Tooltip>
				</Link>

				<Divider className="mt-6" />

				<ul className="w-full mt-4">
					{/* Task menu */}
					<li className=" mb-3">
						<Link
							href={`/profile/${user?.id}`}
							className="text-center flex space-x-3 items-center font-normal"
						>
							<BriefcaseIcon className="w-5 h-5" />{' '}
							<span>{trans.common.TASK}</span>
						</Link>
					</li>
					{/* Team menu */}
					<li className="mb-3">
						<Link href="/" className="flex space-x-3 items-center font-normal">
							<PeopleIcon className="w-5 h-5 stroke-default" />{' '}
							<span>{trans.common.TEAM}</span>
						</Link>
					</li>
					{/* Settings menu */}

					<li className="mb-3">
						<Link
							href={'/settings/personal'}
							className="flex space-x-3 items-center font-normal"
						>
							<SettingsOutlineIcon className="w-5 h-5" />{' '}
							<span>{trans.common.SETTINGS}</span>
						</Link>
					</li>

					{/* Darkmode menu */}
					<li className="flex space-x-3 items-center justify-between font-normal mb-3">
						<div className="flex-1 flex items-center space-x-3">
							<MoonIcon className="w-5 h-5" />{' '}
							<span>{trans.common.DARK_MODE}</span>
						</div>
						<ThemeToggler className="scale-75" />
					</li>

					{/* 3D Mode menu */}
					<li className="flex space-x-3 items-center font-normal mb-3">
						<div className="flex-1 flex items-center space-x-3">
							<BoxIcon className="w-5 h-5" />{' '}
							<span>{trans.common['3D_MODE']}</span>
						</div>
						<TreeModeToggler className="scale-75" />
					</li>

					{/* Themes menu */}
					<li className="flex space-x-3 items-center font-normal mb-3">
						<div className="flex-1 flex space-x-3">
							<DevicesIcon className="w-5 h-5" />{' '}
							<span>{trans.common.THEMES}</span>
						</div>
						<ThemeDropdown />
					</li>
				</ul>
				<Divider className="mt-4 mb-3" />
				<ul className="w-full">
					{/* Logout menu */}
					<li>
						<button
							className="flex space-x-3 items-center font-normal mb-3"
							onClick={logOut}
						>
							<LogoutIcon className="w-5 h-5 text-red-500" />{' '}
							<span>{trans.common.LOGOUT}</span>
						</button>
					</li>
				</ul>
			</div>
		</Card>
	);
}

function ThemeDropdown() {
	const { theme, setTheme } = useTheme();

	const themes = {
		dark: 'Gauzy Dark',
		light: 'Gauzy light',
	};

	const selected = themes[theme as keyof typeof themes];

	return (
		<div className="relative">
			<Listbox value={selected} onChange={setTheme as any}>
				<Listbox.Button className="flex text-sm items-center text-gray-500 dark:text-gray-300">
					{selected}{' '}
					<ChevronDownIcon
						className={clsxm(
							'ml-2 h-5 w-5 dark:text-white transition duration-150 ease-in-out group-hover:text-opacity-80'
						)}
						aria-hidden="true"
					/>
				</Listbox.Button>
				<Listbox.Options className={'absolute inset-0 flex flex-col mt-6'}>
					<Card className="!p-0" shadow="custom">
						{Object.keys(themes).map((key) => (
							<Listbox.Option
								key={key}
								value={key}
								className="text-sm text-gray-600 dark:text-white cursor-pointer"
							>
								{themes[key as keyof typeof themes]}
							</Listbox.Option>
						))}
					</Card>
				</Listbox.Options>
			</Listbox>
		</div>
	);
}
