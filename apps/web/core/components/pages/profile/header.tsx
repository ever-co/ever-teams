import { TUser } from '@/core/types/schemas';
import TimerCard from '@/core/components/timer/timer-card';
import { ChevronLeft } from '@/core/components/icons';
import capitalize from 'lodash/capitalize';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export function Header({ user }: { user: TUser | undefined }) {
	const t = useTranslations();

	return (
		<div className="mt-[100px] flex w-full items-center justify-between rounded-xl bg-card hairline-ring ring-border shadow-sm shadow-black/6.5">
			<div className="ml-4 mb-5 flex flex-col space-y-4">
				<div className="mt-5 mb-2 flex w-fit cursor-pointer items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
					<ChevronLeft className="size-4" />
					<Link href="/">{t('team.BACK_LABEL')}</Link>
				</div>
				<div className="flex items-center mb-[100px]">
					<div className="relative h-[137px] w-[137px]">
						{user?.imageUrl && (
							<Image
								src={user?.imageUrl}
								alt="User Icon"
								width={137}
								height={137}
								className="z-20 object-cover w-full h-full rounded-full"
							/>
						)}

						<div className="absolute inset-0 z-10 w-full h-full animate-pulse">
							<div className="w-full h-full rounded-full bg-foreground/5"></div>
						</div>

						<div className="absolute z-30 rounded-full bg-card p-0.5 top-[100px] right-[5px]">
							<div className="size-5 rounded-full bg-success"></div>
						</div>
					</div>
					<div className="ml-6">
						<div className="flex items-center text-2xl font-semibold text-foreground">
							<span className="flex items-center">
								{user?.firstName && capitalize(user.firstName)}
								{user?.lastName && ' ' + capitalize(user.lastName)}
							</span>
						</div>
						<div className="flex items-center text-sm text-muted-foreground">
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
