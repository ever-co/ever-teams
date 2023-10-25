import { useAuthenticateUser } from '@app/hooks';
import { Popover, Transition } from '@headlessui/react';
import capitalize from 'lodash/capitalize';
import { useTranslation } from 'react-i18next';
import Image from 'next/legacy/image';
import Link from 'next/link';
import { Fragment } from 'react';

interface IOption {
	name: string;
	icon: string;
	link: string;
}

const Profile = () => {
	const { logOut, user } = useAuthenticateUser();
	const { t } = useTranslation();
	const options: IOption[] = [
		{
			name: t('links.common.TASKS'),
			icon: '/assets/svg/profile-icon.svg',
			link: `/profile/${user?.id}`
		},
		{ name: t('links.common.TEAM'), icon: '/assets/svg/teams-icon.svg', link: '' },
		{
			name: t('links.common.Settings'),
			icon: '/assets/svg/settings-icon.svg',
			link: ''
		}
	];

	return (
		<Popover className="relative no-underline border-none">
			{() => (
				<>
					<Popover.Button className="p-0 m-0 mt-1 outline-none">
						<div className="cursor-pointer relative w-[48px] h-[48px]">
							<Image
								src={user?.imageUrl || ''}
								alt="User Icon"
								layout="fill"
								objectFit="cover"
								className="w-full h-full rounded-full"
							/>
						</div>
					</Popover.Button>
					<Transition
						as={Fragment}
						enter="transition ease-out duration-200"
						enterFrom="opacity-0 translate-y-1"
						enterTo="opacity-100 translate-y-0"
						leave="transition ease-in duration-150"
						leaveFrom="opacity-100 translate-y-0"
						leaveTo="opacity-0 translate-y-1"
					>
						<Popover.Panel className="absolute left-1/2 z-10 mt-3 w-[260px] max-w-sm -translate-x-1/2 transform px-4 sm:px-0 lg:max-w-3xl shandow">
							<div className="bg-white shadow dark:bg-[#202023] rounded-[10px] text-[14px] font-light px-[39px] pb-[10px]">
								<div className="">
									<div className="flex pt-[13px] justify-center items-center">
										<div className="bg-[#D7E1EB] p-1 flex items-center justify-center rounded-full">
											<Image
												src={user?.imageUrl || ''}
												alt="User Icon"
												width={84}
												height={84}
												className="flex items-center justify-center rounded-full"
											/>
										</div>
									</div>
									<div className="text-[18px] mt-[7px] font-medium text-[#293241] dark:text-white flex items-center justify-center">
										{user?.firstName && capitalize(user.firstName)}
										{user?.lastName && ' ' + capitalize(user.lastName)}
									</div>
									<div className="text-[#B0B5C7] text-[14px] text-center font-normal">
										{user?.email}
									</div>
								</div>
								<div className="bg-[#EDEEF2] mt-[27px] h-[1px] w-full"></div>
								<div className="mt-[10px]">
									{options.map((option) => (
										<div key={option.name} className="flex items-center space-x-2 ">
											<div className="flex items-center justify-center py-2 mt-1">
												<Image
													src={option.icon}
													alt={option.name + ' icon'}
													width={16}
													height={16}
													className="cursor-pointer"
												/>
											</div>
											<Link
												href={option.link}
												className="hover:text-opacity-75  py-2 mt-1 flex items-center text-[#1B005D] text-[15px] font-normal dark:text-gray-200 justify-start w-full"
											>
												{option.name}
											</Link>
										</div>
									))}
								</div>
								<div className="bg-[#EDEEF2] mt-[10px] h-[1px] w-full"></div>
								<div className="mt-[10px]">
									<div className="flex items-center space-x-2 ">
										<div className="flex items-center justify-center py-2 mt-1">
											<Image
												src="/assets/svg/log-out-icon.svg"
												alt="logout icon"
												width={16}
												height={16}
												className="cursor-pointer"
											/>
										</div>
										<button
											onClick={logOut}
											className="hover:text-opacity-75  py-2 mt-1 flex items-center text-[#DE437B] text-[15px] font-normal justify-start w-full"
										>
											{t('common.LOGOUT')}
										</button>
									</div>
								</div>
							</div>{' '}
						</Popover.Panel>
					</Transition>
				</>
			)}
		</Popover>
	);
};

export default Profile;
