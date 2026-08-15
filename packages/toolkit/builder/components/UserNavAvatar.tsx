import { cn, Tooltip } from '@ever-teams/toolkit-ui';
import React, { useState } from 'react';
import { Popover, PopoverButton, PopoverPanel, Transition } from '@headlessui/react';
import { Card } from './card';
import { Text } from './typography';
import { Divider } from './divider';
import { imgTitle, useTeamsContext } from '@ever-teams/atoms';
import { Copy, Paste } from '../app/svgs';

export function UserNavAvatar() {
	const { authenticatedUser: user } = useTeamsContext();
	const name = user?.firstName || user?.lastName || user?.username || '';
	return (
		<Popover className="relative flex items-center">
			<PopoverButton className="outline-none px-5">
				<div
					className={cn(
						'w-[3rem] h-[3rem]',
						'flex justify-center items-center',
						'rounded-full text-white',
						'shadow-md text-[2.063rem] dark:text-[1.75rem] text-thin font-PlusJakartaSans '
					)}
					style={{
						backgroundColor: `#10b981`
					}}
				>
					<div className="w-[3rem] h-[3rem] flex justify-center items-center relative rounded-full dark:border-[0.25rem] dark:border-[#26272C] text-white">
						{imgTitle(name).charAt(0)}
					</div>
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
				<PopoverPanel
					transition
					anchor="bottom"
					className="z-[var(--z-modal)] absolute  divide-y divide-white/5 rounded-xl  text-sm/6 transition duration-200 ease-in-out [--anchor-gap:var(--spacing-5)] data-[closed]:-translate-y-1 data-[closed]:opacity-0 px-5"
				>
					<MenuIndicator />
					<UserNavMenu />
				</PopoverPanel>
			</Transition>
		</Popover>
	);
}

export function MenuIndicator() {
	return (
		<Card
			className={cn(
				'absolute top-4 -z-10 bg-transparent dark:bg-transparent ',
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

export const UserNavMenu = () => {
	const { authenticatedUser: user, token } = useTeamsContext();
	const name = user?.firstName || user?.lastName || user?.username || '';

	return (
		<Card
			shadow="custom"
			className="w-[308px] flex flex-col nav-items--shadow z-50 rounded-[10px] shadow-xlcard dark:bg-[#1B1D22] border-[0.125rem] border-transparent dark:border-[#26272C]"
		>
			<div className="flex flex-col items-center justify-center">
				<div
					className={cn(
						'w-[72px] h-[72px]',
						'flex justify-center items-center relative',
						'rounded-full text-xs text-white',
						'shadow-md text-5xl font-thin relative font-PlusJakartaSans cursor-pointer mb-5'
					)}
					style={{
						backgroundColor: '#10b981'
					}}
				>
					<div className="relative w-[72px] h-[72px] flex justify-center items-center">
						{imgTitle(name).charAt(0)}
					</div>
				</div>

				<div className="w-full text-center">
					<Tooltip
						message={`${user?.firstName} ${user?.lastName}`}
						enabled={true}
						placement="auto"
						labelClassName=""
					>
						<Text.Heading as="h3" className="overflow-hidden text-ellipsis whitespace-nowrap">
							{`${user?.firstName} ${user?.lastName}`}
						</Text.Heading>
					</Tooltip>

					<Tooltip message={`${user?.email}`} enabled={true} placement="auto">
						<Text className="text-sm overflow-hidden text-ellipsis whitespace-nowrap text-[#7E7991]">
							{user?.email}
						</Text>
					</Tooltip>
					<TokenDisplay token={`${token}`} />
				</div>
				<Divider className="mt-4 mb-3" />

				<ul className="w-full flex items-center justify-center">
					{/* Logout menu */}
					<li>
						<button
							className="flex space-x-3 items-center font-normal mb-3 text-[#DE437B]"
							onClick={() => {
								// logOut();
								// signOutFunction();
							}}
						>
							{/* <LogoutRoundIcon className="w-5 h-5 stroke-[#DE437B]" />{' '} */}
							<span>LOGOUT</span>
						</button>
					</li>
				</ul>
			</div>
		</Card>
	);
};

export const TokenDisplay = ({ token }: { token: string }) => {
	const [isCopied, setIsCopied] = useState(false);
	const truncatedToken = token.length > 30 ? `${token.slice(0, 15)}...${token.slice(16, 30)}` : token;

	const handleCopy = () => {
		navigator.clipboard
			.writeText(token)
			.then(() => {
				setIsCopied(true);
				setTimeout(() => setIsCopied(false), 2000);
			})
			.catch((err) => console.error('Failed to copy: ', err));
	};

	return (
		<div className="flex items-center justify-center gap-x-2 text-xs text-gray-500">
			<span>{truncatedToken}</span>
			<button onClick={handleCopy} className="copy-button">
				{isCopied ? <Paste /> : <Copy />}
			</button>
		</div>
	);
};
