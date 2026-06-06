'use client';
import { TeamsBasicTimer, TeamsEssentialTimer, TeamsModernTimer, useTeamsContext } from '@ever-teams/atoms';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@ever-teams/toolkit-ui';
import { useEffect } from 'react';

const CarouselItems = [
	[
		<TeamsModernTimer key="modern-teams-1" expandable={true} showProgress={false} size={'sm'} />,
		<TeamsModernTimer key="modern-teams-2" expandable={true} showProgress={true} size={'sm'} />,
		<TeamsModernTimer key="modern-teams-3" expandable={true} showProgress={true} />,
		<TeamsModernTimer key="modern-teams-4" expandable={true} showProgress={true} variant={'bordered'} />
	],
	[
		<TeamsBasicTimer key="basic-timer" />,
		<TeamsBasicTimer border="thick" readonly key="basic-timer-border" />,
		<TeamsBasicTimer border="thick" readonly rounded="large" key="basic-timer-border-full-rounded" />,
		<TeamsBasicTimer border="thick" readonly rounded="small" key="basic-timer-border-rounded" />
	],
	[
		<TeamsBasicTimer background="primary" color="destructive" readonly key="basic-timer-contained" />,
		<TeamsBasicTimer
			background="primary"
			color="destructive"
			readonly
			rounded="large"
			key="basic-timer-contained-full-rounded"
		/>,
		<TeamsBasicTimer
			background="primary"
			color="destructive"
			readonly
			rounded="small"
			key="basic-timer-contained-rounded"
		/>
	],
	[
		<TeamsBasicTimer background="secondary" readonly key="basic-timer-gray" />,
		<TeamsBasicTimer background="secondary" readonly rounded="large" key="basic-timer-gray-full-rounded" />,
		<TeamsBasicTimer background="secondary" readonly rounded="small" key="basic-timer-gray-rounded" />,
		<TeamsBasicTimer background="secondary" icon readonly key="basic-timer-icon-gray" />,
		<TeamsBasicTimer
			background="secondary"
			icon
			readonly
			rounded="large"
			key="basic-timer-icon-gray-full-rounded"
		/>,
		<TeamsBasicTimer background="secondary" icon progress readonly key="basic-timer-icon-gray-progress" />,
		<TeamsBasicTimer background="secondary" icon progress key="basic-timer-icon-gray-progress-button" />,
		<TeamsBasicTimer background="secondary" icon readonly rounded="small" key="basic-timer-icon-gray-rounded" />,
		<TeamsBasicTimer
			background="secondary"
			icon
			progress
			readonly
			rounded="small"
			key="basic-timer-icon-gray-rounded-progress"
		/>
	],
	[
		<TeamsEssentialTimer key="teams-essential" />,
		<TeamsEssentialTimer border="thick" readonly key="teams-essential-border" />,
		<TeamsEssentialTimer border="thick" readonly rounded="small" key="teams-essential-border-rounded" />,
		<TeamsEssentialTimer border="thick" readonly rounded="large" key="teams-essential-border-full-rounded" />,
		<TeamsEssentialTimer background="secondary" readonly key="teams-essential-gray" />,
		<TeamsEssentialTimer background="secondary" readonly rounded="small" key="teams-essential-gray-rounded" />,
		<TeamsEssentialTimer background="secondary" readonly rounded="large" key="teams-essential-gray-full-rounded" />,
		<TeamsEssentialTimer background="primary" color="destructive" readonly key="teams-essential-contained" />,
		<TeamsEssentialTimer
			background="primary"
			color="destructive"
			readonly
			rounded="small"
			key="teams-essential-contained-rounded"
		/>,
		<TeamsEssentialTimer
			background="primary"
			color="destructive"
			readonly
			rounded="large"
			key="teams-essential-contained-full-rounded"
		/>
	]
];

const Page = () => {
	const { authenticatedUser: user } = useTeamsContext();

	useEffect(() => {
		if (!user) {
			window.location.href = '/';
		}
	}, [user]);

	return (
		<div className="min-h-[65vh] gap-10  flex flex-col my-10 justify-center items-center">
			<div className=" flex flex-col gap-6 text-xl items-center">
				<h1 className=" font-bold text-center text-6xl tracking-tighter">Start Tracking Time Now</h1>
				<p className="text-center text-[#777777] dark:text-gray-400">
					Discover Teams NextJs Boilerplate and themes to jumpstart your application or website build.
				</p>
				{/* <TeamsThemeToggle /> */}
			</div>
			<Carousel
				opts={{
					align: 'start',
					loop: true
				}}
				className="max-w-[80vw] w-fit"
			>
				<CarouselContent>
					{CarouselItems.map((items, index) => (
						<CarouselItem className="flex gap-6 items-center justify-center flex-wrap" key={index}>
							{items}
						</CarouselItem>
					))}
				</CarouselContent>
				<CarouselPrevious />
				<CarouselNext />
			</Carousel>
		</div>
	);
};

export default Page;
