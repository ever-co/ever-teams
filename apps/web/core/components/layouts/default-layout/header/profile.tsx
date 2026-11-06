import { useAuthenticateUser } from '@/core/hooks';
import { Popover, PopoverButton, PopoverPanel, Transition } from '@headlessui/react';
import capitalize from 'lodash/capitalize';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface IOption {
	name: string;
	icon: string;
	link: string;
}

const Profile = () => {
	const { logOut, user } = useAuthenticateUser();
	const t = useTranslations();
	const options: IOption[] = [
		{
			name: t('links.common.TASKS'),
			icon: '/assets/svg/profile-icon.svg',
			link: `/profile/${user?.id}`
		},
		{ name: t('links.common.TEAM'), icon: '/assets/svg/teams-icon.svg', link: '' },
		{
			name: t('links.common.SETTINGS'),
			icon: '/assets/svg/settings-icon.svg',
			link: ''
		}
	];

	return (
		<Popover className="relative no-underline border-none">
			{() => (
				<>
					<PopoverButton className="p-0 m-0 mt-1 outline-none">
						<div className="cursor-pointer relative w-[48px] h-[48px]">
							<Image
								src={user?.imageUrl || ''}
								alt="User Icon"
								fill
								sizes="48px"
								className="w-full h-full rounded-full object-cover"
							/>
						</div>
					</PopoverButton>
					<Transition
						as="div"
						enter="transition ease-out duration-200"
						enterFrom="opacity-0 translate-y-1"
						enterTo="opacity-100 translate-y-0"
						leave="transition ease-in duration-150"
						leaveFrom="opacity-100 translate-y-0"
						leaveTo="opacity-0 translate-y-1"
					>
						<PopoverPanel className="absolute left-1/2 z-10 mt-3 w-[260px] max-w-sm -translate-x-1/2 transform px-4 sm:px-0 lg:max-w-3xl">
							<div className="rounded-xl bg-popover px-6 pb-2 text-sm font-normal text-popover-foreground hairline-ring ring-border shadow-md shadow-black/6.5">
								<div className="">
									<div className="flex pt-[13px] justify-center items-center">
										<div className="flex items-center justify-center rounded-full bg-foreground/5 p-1">
											<Image
												src={user?.imageUrl || ''}
												alt="User Icon"
												width={84}
												height={84}
												className="flex items-center justify-center rounded-full"
											/>
										</div>
									</div>
									<div className="mt-2 flex items-center justify-center text-sm font-semibold text-foreground">
										{user?.firstName && capitalize(user.firstName)}
										{user?.lastName && ' ' + capitalize(user.lastName)}
									</div>
									<div className="text-center text-xs font-normal text-muted-foreground">
										{user?.email}
									</div>
								</div>
								<div className="mt-4 h-px w-full bg-border"></div>
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
												className="mt-1 flex w-full items-center justify-start py-2 text-sm font-normal text-foreground transition-colors hover:text-foreground/75"
											>
												{option.name}
											</Link>
										</div>
									))}
								</div>
								<div className="mt-2 h-px w-full bg-border"></div>
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
											className="mt-1 flex w-full items-center justify-start py-2 text-sm font-normal text-destructive-ink transition-colors hover:text-destructive-ink/75"
										>
											{t('common.LOGOUT')}
										</button>
									</div>
								</div>
							</div>
						</PopoverPanel>
					</Transition>
				</>
			)}
		</Popover>
	);
};

export default Profile;
