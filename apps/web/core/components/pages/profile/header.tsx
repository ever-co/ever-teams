import { IUser } from '@/core/types/interfaces/IUserData';
import TimerCard from '@/core/components/shared/timer/timer-card';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import capitalize from 'lodash/capitalize';
import Image from 'next/legacy/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export function Header({ user }: { user: IUser | undefined }) {
	const t = useTranslations();

	return (
		<div className="bg-[#FFFF] dark:bg-[#202023] mt-[100px] rounded-[20px] w-full flex items-center justify-between">
			<div className="ml-[16px] mb-[20px] flex flex-col space-y-[15px]">
				<div className="w-[171px] bg-[#ACB3BB] mt-[20px] mb-2 text-[18px] text-[#FFFFFF] rounded-[8px] px-[17px] py-[5px] flex items-center cursor-pointer hover:opacity-80">
					<ChevronLeftIcon className="w-[15px] mr-[10px]" />
					<Link href="/">{t('team.BACK_LABEL')}</Link>
				</div>
				<div className="flex items-center mb-[100px]">
					<div className="relative h-[137px] w-[137px]">
						{user?.imageUrl && (
							<Image
								src={user?.imageUrl}
								alt="User Icon"
								className="z-20 w-full h-full rounded-full"
								layout="fill"
								objectFit="cover"
							/>
						)}

						<div className="absolute inset-0 z-10 w-full h-full shadow animate-pulse dark:divide-gray-700 dark:border-gray-700">
							<div className="w-full h-full rounded-[50%] bg-gray-200 dark:bg-gray-700"></div>
						</div>

						<div className="absolute z-30 rounded-full bg-white p-[1px] top-[100px] right-[5px]">
							<div className="bg-[#02C536] w-[22px] h-[22px] rounded-full"></div>
						</div>
					</div>
					<div className="ml-[24px]">
						<div className="text-[30px] text-[#1B005D] dark:text-[#FFFFFF] font-bold flex items-center ">
							<span className="flex items-center">
								{user?.firstName && capitalize(user.firstName)}
								{user?.lastName && ' ' + capitalize(user.lastName)}
							</span>
						</div>
						<div className="text-[#B0B5C7] flex items-center">
							<span className="flex items-center">{user?.email}</span>
						</div>
					</div>
				</div>
			</div>
			<div className="flex justify-center items-center space-x-[27px] mr-[27px] w-1/2 ml-[48px]">
				<TimerCard />
			</div>
		</div>
	);
}
