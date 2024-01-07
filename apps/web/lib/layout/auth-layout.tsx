import { clsxm } from '@app/utils';
import { Meta, Text } from 'lib/components';
import { EverTeamsLogo } from 'lib/components/svgs';
import Image from 'next/legacy/image';
import { PropsWithChildren, ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Footer } from './footer';

type Props = {
	title?: string;
	description?: string | ReactNode;
	isAuthPage?: boolean;
} & PropsWithChildren;

export function AuthLayout({ children, title, description, isAuthPage = true }: Props) {
	const t = useTranslations();
	return (
		<>
			<Meta title={title} />
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
							{['auth-bg-cover.png', 'auth-bg-cover-dark.png'].map((image) => {
								return (
									<div
										className={clsxm(
											'ml-[12%] rounded-3xl absolute w-full h-full inset-0',
											[
												!image.endsWith('dark.png') && ['opacity-100 dark:opacity-0'],
												image.endsWith('dark.png') && ['opacity-0 dark:opacity-100']
											],
											'shadow-[-76px_-13px_244px_-42px_rgba(40,32,72,0.55)]',
											'dark:shadow-[-76px_-13px_244px_-42px_rgba(0,0,0,0.75)]'
										)}
										key={image}
									>
										<Image
											src={`/assets/cover/${image}`}
											layout="responsive"
											objectFit="fill"
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

					<div className="self-end w-full h-1/3 bg-primary-mid p-9">
						<Text.Heading
							as="h3"
							className="text-white lg:text-lg xl:text-xl 2xl:text-3xl font-normal leading-[120%] px-9 text-ellipsis mb-5"
						>
							{t('pages.auth.COVER_TITLE')}
						</Text.Heading>

						<Text className="text-sm text-gray-400 px-9 text-ellipsis">
							{t('pages.auth.COVER_DESCRIPTION')}
						</Text>
					</div>
				</div>

				{/* Content side */}
				<div
					className={clsxm(
						'w-full lg:w-1/2 h-screen min-h-[500px]',
						'flex flex-col items-center justify-between ml-auto'
					)}
				>
					<div className="flex flex-col items-center justify-center w-full mt-20 lg:mt-23">
						{isAuthPage && (
							<div className="w-11/12">
								{title && (
									<Text.Heading as="h1" className="mb-3 text-center min-w-[400px]">
										{title}
									</Text.Heading>
								)}

								{description && (
									<Text className="text-sm md:text-lg text-gray-400 text-center mb-[56px] min-w-[400px] min-h-[10vh]">
										{description}
									</Text>
								)}
							</div>
						)}

						{children}
					</div>
					<Footer className="md:flex-col xl:flex-row" />
				</div>
			</div>
		</>
	);
}
