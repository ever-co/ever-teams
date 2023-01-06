import clsxm from '@app/utils/clsxm';
import { Text } from 'lib/components';
import { AppLogo } from 'lib/components/svgs';
import { useTheme } from 'next-themes';
import Image from 'next/legacy/image';
import { PropsWithChildren } from 'react';
import { Footer } from './footer';

type Props = { title?: string; description?: string } & PropsWithChildren;

export function AuthLayout({ children, title, description }: Props) {
	const { theme } = useTheme();

	return (
		<div className="flex">
			{/* Bg Cover side */}
			<div
				className={clsxm(
					'fixed h-full min-h-screen w-1/2 hidden lg:flex lg:flex-col lg:justify-between bg-primary dark:bg-primary-xlight overflow-hidden'
				)}
			>
				<div className="absolute w-10 -right-10 top-0 h-full  z-10 shadow-2xl shadow-black" />

				<div className="overflow-hidden">
					<div className="p-9 pt-4">
						<AppLogo className="fill-white scale-75" />
						<Text className="text-xs ml-7 text-gray-300">
							Welcome to Gauzy teams
						</Text>
					</div>
					{['auth-bg-cover.png', 'auth-bg-cover-dark.png'].map((image) => {
						return (
							<div
								className={clsxm(
									'w-[110%] h-full min-h-[800px] relative ml-[12%] rounded-3xl',
									[
										!image.endsWith('dark.png') && ['dark:hidden'],
										image.endsWith('dark.png') && ['hidden dark:block'],
									]
								)}
								key={image}
								style={
									theme === 'dark'
										? {
												boxShadow: '-76px -13px 244px -42px rgba(0,0,0,0.75',
											}
										: {}
								}
							>
								<Image
									src={`/assets/cover/${image}`}
									layout="responsive"
									objectFit="fill"
									width={2880}
									height={2840}
									className={
										'rounded-3xl origin-top-left scale-[0.95] 2xl:scale-[0.85] bg-transparent'
									}
								/>
							</div>
						);
					})}
				</div>

				<div className="h-1/3 w-full bg-primary-mid self-end p-9">
					<Text.Heading
						as="h3"
						className="text-white xl:text-3xl 2xl:text-4xl font-normal leading-[120%] px-9 text-ellipsis mb-5"
					>
						Follow your teams work progress in real-time!
					</Text.Heading>

					<Text className="text-gray-400 px-9 text-ellipsis text-sm">
						Lorem ipsum dolor sit amet consectetur. Amet est risus etiam
						vestibulum iaculis montes tellus. Tincidunt mattis
					</Text>
				</div>
			</div>

			{/* Content side */}
			<div
				className={clsxm(
					'w-full lg:w-1/2 scale-100 lg:scale-90 xl:scale-100 h-screen min-h-[500px]',
					'flex flex-col items-center justify-between ml-auto'
				)}
			>
				<div className="w-11/12 md:w-1/2 mt-20 lg:mt-23 flex flex-col items-center">
					{title && (
						<Text.Heading as="h1" className="mb-3 text-center min-w-[400px]">
							{title}
						</Text.Heading>
					)}

					{description && (
						<Text className="text-sm md:text-lg text-gray-400 text-center mb-[56px] min-w-[400px]">
							{description}
						</Text>
					)}

					{children}
				</div>
				<Footer className="md:flex-col xl:flex-row" />
			</div>
		</div>
	);
}
