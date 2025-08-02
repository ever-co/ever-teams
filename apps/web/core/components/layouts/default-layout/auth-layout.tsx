import { Text } from '@/core/components';
import { EverTeamsLogo } from '@/core/components/svgs';
import { useTranslations } from 'next-intl';
import Image from 'next/legacy/image';
import { PropsWithChildren, ReactNode } from 'react';

import { MAIN_PICTURE, MAIN_PICTURE_DARK } from '@/core/constants/config/constants';
import { clsxm } from '@/core/lib/utils';

import { Footer } from './footer';
import { cn } from '@/core/lib/helpers';

type Props = {
	title?: string;
	description?: string | ReactNode;
	isAuthPage?: boolean;
} & PropsWithChildren;

export function AuthLayout({ children, title, description, isAuthPage = true }: Props) {
	const t = useTranslations();

	return (
		<>
			<div className="flex flex-row">
				{/* Bg Cover side */}
				<div
					className={clsxm(
						'fixed h-full min-h-screen w-1/2 hidden lg:flex lg:flex-col lg:justify-between bg-primary dark:bg-primary-xlight overflow-hidden'
					)}
				>
					<div className="absolute top-0 z-10 w-10 h-full shadow-2xl -right-10 shadow-black" />

					<div className="overflow-hidden h-[100vh]">
						<div className="pt-4 p-9">
							<EverTeamsLogo color="white-black" className="mt-3 mb-1 ml-7" />
							<Text className="text-xs text-gray-300 ml-7 dark:text-default">
								{t('pages.auth.WELCOME_TEAMS')}
							</Text>
						</div>

						<div className="relative w-[110%] h-full min-h-[800px]">
							{[MAIN_PICTURE, MAIN_PICTURE_DARK].map((image, index) => {
								const isDarkModeImage = index === 1; // The second image is the dark mode one
								return (
									<div
										className={clsxm(
											'ml-[12%] rounded-3xl absolute w-full h-full inset-0',
											[
												!isDarkModeImage && ['opacity-100 dark:opacity-0'],
												isDarkModeImage && ['opacity-0 dark:opacity-100']
											],
											'shadow-[-76px_-13px_244px_-42px_rgba(40,32,72,0.55)]',
											'dark:shadow-[-76px_-13px_244px_-42px_rgba(0,0,0,0.75)]'
										)}
										key={image}
									>
										<Image
											src={image}
											layout="responsive"
											objectFit="fill"
											priority
											width={2880}
											height={2840}
											alt={t('TITLE')}
											className={
												'rounded-3xl origin-top-left scale-[0.95] 2xl:scale-[0.85] bg-transparent'
											}
										/>
									</div>
								);
							})}
						</div>
					</div>

					<div className="self-end w-full h-fit bg-primary-mid p-9">
						<Text.Heading
							as="h3"
							className="text-white lg:text-lg xl:text-xl 2xl:text-3xl font-normal leading-[120%] px-9 text-ellipsis mb-5"
						>
							{t('pages.auth.COVER_TITLE')}
						</Text.Heading>

						<Text.Label className="text-sm text-gray-400 px-9 text-ellipsis">
							{t('pages.auth.COVER_DESCRIPTION')}
						</Text.Label>
					</div>
				</div>

				<div
					className={clsxm(
						'w-full lg:w-1/2 h-screen min-h-[500px]',
						'flex flex-col items-center justify-between ml-auto'
					)}
				>
					<div
						className={cn(
							isAuthPage && 'flex flex-col items-center gap-10 justify-center',
							'w-full flex-grow'
						)}
					>
						{isAuthPage && (
							<div className="w-11/12 flex-col gap-1 flex justify-center items-center ">
								{title && (
									<Text.Heading as="h1" className="text-center">
										{title}
									</Text.Heading>
								)}
								{description &&
									(typeof description === 'string' ? (
										<p className="text-sm md:text-lg text-gray-400 text-center">{description}</p>
									) : (
										description
									))}
							</div>
						)}

						{children}
					</div>
					<Footer className="md:flex-col h-[4.5rem] flex-shrink border xl:flex-row" />
				</div>
			</div>
		</>
	);
}
