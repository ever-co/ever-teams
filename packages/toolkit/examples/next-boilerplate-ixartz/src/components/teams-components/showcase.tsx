'use client';

import {
	TeamsModernTimer,
	TeamsEssentialTimer,
	TeamsBasicTimer,
	TeamsThemeToggle,
	TeamsBasicReport,
	TeamsAppsUrlList,
	TeamsProjectsList,
	TeamsTasksList,
	TeamsDailyWorkedTimeDisplayer,
	TeamsWeeklyWorkedTimeDisplayer,
	TeamsWeeklyActivityDisplayer,
	TeamsDailyActivityDisplayer,
	TeamsWorkedProjectDisplayer,
	TeamsRegistrationForm,
	TeamsLoginForm,
	TeamsTimerForm,
	TeamsFontToggle,
	useTimer
} from '@ever-teams/atoms';
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
	Tabs,
	TabsContent,
	TabsListThemed,
	TabsTrigger
} from '@ever-teams/toolkit-ui';

const CarouselItems = [
	[
		<TeamsModernTimer expandable={true} showProgress={false} size={'sm'} />,
		<TeamsModernTimer expandable={true} showProgress={true} size={'sm'} />,
		<TeamsModernTimer expandable={true} showProgress={true} />
	],
	[
		<TeamsBasicTimer />,
		<TeamsBasicTimer border="thick" readonly />,
		<TeamsBasicTimer border="thick" readonly rounded="large" />,
		<TeamsBasicTimer border="thick" readonly rounded="small" />
	],
	[
		<TeamsBasicTimer background="primary" color="destructive" readonly />,
		<TeamsBasicTimer background="primary" color="destructive" readonly rounded="large" />,
		<TeamsBasicTimer background="primary" color="destructive" readonly rounded="small" />
	],
	[
		<TeamsBasicTimer background="secondary" readonly />,
		<TeamsBasicTimer background="secondary" readonly rounded="large" />,
		<TeamsBasicTimer background="secondary" readonly rounded="small" />,
		<TeamsBasicTimer background="secondary" icon readonly />,
		<TeamsBasicTimer background="secondary" icon readonly rounded="large" />,
		<TeamsBasicTimer background="secondary" icon progress readonly />,
		<TeamsBasicTimer background="secondary" icon progress />,
		<TeamsBasicTimer background="secondary" icon readonly rounded="small" />,
		<TeamsBasicTimer background="secondary" icon progress readonly rounded="small" />
	],
	[
		<TeamsEssentialTimer />,
		<TeamsEssentialTimer border="thick" readonly />,
		<TeamsEssentialTimer border="thick" readonly rounded="large" />,
		<TeamsEssentialTimer border="thick" readonly rounded="small" />,

		<TeamsEssentialTimer background="primary" color="destructive" readonly />,
		<TeamsEssentialTimer background="primary" color="destructive" readonly rounded="large" />,
		<TeamsEssentialTimer background="primary" color="destructive" readonly rounded="small" />,
		<TeamsEssentialTimer background="secondary" readonly />,
		<TeamsEssentialTimer background="secondary" readonly rounded="large" />,
		<TeamsEssentialTimer background="secondary" readonly rounded="small" />,
		<TeamsEssentialTimer background="secondary" icon readonly />,
		<TeamsEssentialTimer background="secondary" icon readonly rounded="large" />,
		<TeamsEssentialTimer background="secondary" icon progress readonly />,
		<TeamsEssentialTimer background="secondary" icon progress />,
		<TeamsEssentialTimer background="secondary" icon readonly rounded="small" />,
		<TeamsEssentialTimer background="secondary" icon progress readonly rounded="small" />
	]
];

const TeamsShowcase = () => {
	const { currentTeamsState, setCurrentTeamsState, isRunning } = useTimer();
	return (
		<div className="flex py-3 justify-center items-center rounded-xl">
			<Tabs defaultValue="timer" className="transition-all w-full  flex flex-col  gap-3 delay-200">
				<div className="flex justify-between items-center">
					<TabsListThemed className="w-fit bg-primary place-items-center bg-opacity-20  h-10 text-white self-center">
						<TabsTrigger value="timer">{'Timers'}</TabsTrigger>
						<TabsTrigger value="report">{'Reports'}</TabsTrigger>
						<TabsTrigger value="displayer">{'Displayers'}</TabsTrigger>
						<TabsTrigger value="form">{'Forms'}</TabsTrigger>
					</TabsListThemed>
					<TeamsThemeToggle />
				</div>
				<TabsContent value="timer">
					<Carousel
						opts={{
							align: 'start',
							loop: true
						}}
						className=" "
					>
						<CarouselContent>
							{CarouselItems.map((items, index) => (
								<CarouselItem
									className="flex gap-6 w-fit items-center justify-center flex-wrap"
									key={index}
								>
									{items.map((elt, i) => (
										<span key={i}>{elt}</span>
									))}
								</CarouselItem>
							))}
						</CarouselContent>
						<CarouselPrevious />
						<CarouselNext />
					</Carousel>
				</TabsContent>
				<TabsContent value="report" className="flex flex-wrap justify-center items-center gap-3">
					<TeamsBasicReport type="area" />
					<TeamsBasicReport type="line" />
					<TeamsBasicReport type="bar" />
					<TeamsAppsUrlList />
					<TeamsProjectsList />
					<TeamsTasksList />
				</TabsContent>
				<TabsContent value="displayer" className="flex flex-wrap justify-center items-center gap-3">
					<TeamsDailyWorkedTimeDisplayer />
					<TeamsWeeklyWorkedTimeDisplayer />
					<TeamsWeeklyActivityDisplayer />
					<TeamsDailyActivityDisplayer />
					<TeamsWorkedProjectDisplayer />
				</TabsContent>
				<TabsContent value="form" className="flex flex-wrap justify-center items-center gap-3">
					<TeamsRegistrationForm />
					<TeamsLoginForm />
					<TeamsTimerForm
						isTimerRunning={isRunning}
						currentTeamsState={currentTeamsState}
						setCurrentTeamsState={setCurrentTeamsState}
					/>
					<TeamsFontToggle />
					<TeamsThemeToggle />
				</TabsContent>
			</Tabs>
		</div>
	);
};

export default TeamsShowcase;
