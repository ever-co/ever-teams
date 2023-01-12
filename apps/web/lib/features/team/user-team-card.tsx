import { clsxm } from '@app/utils';
import { Avatar, Card, RoundedButton, Text } from 'lib/components';
import { MailIcon, TimerPlayIcon } from 'lib/components/svgs';
import { taskStatus, TaskStatus } from '../task/task-status';
import { useCustomEmblaCarousel } from '@app/hooks';

export function UserTeamCardHeader() {
	return (
		<ul className="flex row font-normal justify-between mb-3 mt-16">
			<li>Status</li>
			<li>Name</li>
			<li>Task</li>
			<li>Worked on Task</li>
			<li>Estimate</li>
			<li>Total worked Today</li>
		</ul>
	);
}

export function UserTeamCard() {
	return (
		<Card shadow="bigger" className="relative flex items-center py-3">
			<Dragger />

			<UserInfo />

			<TaskInfo />
		</Card>
	);
}

function Dragger() {
	return (
		<div className="absolute -left-0">
			<svg
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					d="M9 3H11V5H9V3ZM13 3H15V5H13V3ZM9 7H11V9H9V7ZM13 7H15V9H13V7ZM9 11H11V13H9V11ZM13 11H15V13H13V11ZM9 15H11V17H9V15ZM13 15H15V17H13V15ZM9 19H11V21H9V19ZM13 19H15V21H13V19Z"
					fill="#CCCCCC"
				/>
			</svg>
		</div>
	);
}

function TaskInfo() {
	const {
		viewportRef,
		nextBtnEnabled,
		scrollNext,
		prevBtnEnabled,
		scrollPrev,
	} = useCustomEmblaCarousel(0, {
		dragFree: true,
		containScroll: 'trimSnaps',
	});

	return (
		<div className="border-l-[2px] dark:border-l-gray-600 flex flex-col items-start justify-center w-80 px-4">
			<Text className="text-sm">
				Working on UI Design & making prototype for user testing tomorrow
			</Text>

			<div className="relative w-full h-full flex flex-col justify-center">
				<div ref={viewportRef} className="overflow-hidden w-full relative">
					<div className="flex space-x-2 mt-2">
						<TaskStatus {...taskStatus['In Review']} name="In Review" />
						<TaskStatus {...taskStatus['Blocked']} name="Blocked" />
						<TaskStatus {...taskStatus['Completed']} name="Completed" />
						<TaskStatus {...taskStatus['Todo']} name="Todo" />
					</div>
				</div>

				{nextBtnEnabled && (
					<RoundedButton
						onClick={scrollNext}
						className={'absolute w-6 h-6 -right-3 -mb-2'}
					>
						{'>'}
					</RoundedButton>
				)}

				{prevBtnEnabled && (
					<RoundedButton
						onClick={scrollPrev}
						className={'absolute w-6 h-6 -left-3  -mb-2'}
					>
						{'<'}
					</RoundedButton>
				)}
			</div>
		</div>
	);
}

function UserInfo() {
	return (
		<div className="flex items-center space-x-4 ">
			<Avatar
				size={60}
				imageUrl="/assets/profiles/mukesh.png"
				className="relative"
			>
				<div
					className={clsxm(
						'bg-green-300 flex items-center justify-center absolute w-5 h-5 rounded-full  border z-20 bottom-3 -right-1 -mb-3'
					)}
				>
					<TimerPlayIcon className="w-3 h-3 fill-green-700" />
				</div>
			</Avatar>

			<div className="w-64">
				<Text.Heading as="h3">Ryan Reynold</Text.Heading>
				<Text className="text-gray-400 flex items-center space-x-1">
					<MailIcon /> <span>RyanR@gmail.com</span>
				</Text>
			</div>
		</div>
	);
}
