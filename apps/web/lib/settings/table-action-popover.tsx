import { Popover, Transition } from '@headlessui/react';
import { MenuIcon } from 'lib/components/svgs';
import { Fragment } from 'react';
import React, { useState } from 'react';

export const TableActionPopover = () => {
	const [isOpen, setIsOpen] = useState(false);

	const handleClick = () => {
		setIsOpen(!isOpen);
	};
	return (
		<Popover className="relative border-none no-underline w-full">
			{() => (
				<>
					<Transition
						as={Fragment}
						enter="transition ease-out duration-200"
						enterFrom="opacity-0 translate-y-1"
						enterTo="opacity-100 translate-y-0"
						leave="transition ease-in duration-150"
						leaveFrom="opacity-100 translate-y-0"
						leaveTo="opacity-0 translate-y-1"
					>
						<Popover.Panel
							className="z-10 absolute right-0  bg-white  dark:bg-[#202023] rounded-2xl w-[7.5rem] h-36 flex flex-col pl-5 pr-5 pt-2 pb-2"
							style={{ boxShadow: ' rgba(0, 0, 0, 0.12) -24px 17px 49px' }}
						>
							<div
								className="flex items-center h-8 w-auto  hover:cursor-pointer"
								onClick={handleClick}
							>
								<span className="text-[#282048] text-xs font-semibold dark:text-white">
									Edit
								</span>
							</div>
							<div className="flex items-center h-8 w-auto  hover:cursor-pointer">
								<span className="text-[#282048] text-xs font-semibold dark:text-white">
									Change Role
								</span>
							</div>
							<div className="flex items-center h-8 w-auto  hover:cursor-pointer">
								<span className="text-[#282048] text-xs font-semibold dark:text-white">
									Permission
								</span>
							</div>
							<div className="flex items-center h-8 w-auto  hover:cursor-pointer">
								<span className="text-[#E27474] text-xs font-semibold">
									Delete
								</span>
							</div>
						</Popover.Panel>
					</Transition>
					<Popover.Button className="outline-none mb-[15px] w-full">
						<MenuIcon className="stroke-[#292D32] dark:stroke-white" />
					</Popover.Button>
				</>
			)}
		</Popover>
	);
};
