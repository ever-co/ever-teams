import { clsxm } from '@app/utils';
import { withAuthentication } from 'lib/app/authenticator';
import { Breadcrumb, Card, Container } from 'lib/components';
import {
	TaskDevicesDropdown,
	TaskEstimate,
	TaskInput,
	TaskPropertiesDropdown,
	TaskSizesDropdown,
	TaskStatusDropdown,
	TeamMembers,
	Timer,
	UserTeamCardHeader,
} from 'lib/features';
import { MainLayout } from 'lib/layout';

function MainPage() {
	return (
		<MainLayout>
			<div className="bg-white dark:bg-dark--theme pt-16 -mt-8 pb-4">
				<Container>
					<Breadcrumb paths={['Dashboard', 'Team Page']} className="text-sm" />
					<TaskTimerSection />

					{/* Header user card list */}
					<UserTeamCardHeader />
				</Container>
			</div>

			<Container className='mb-10'>
				<TeamMembers />
			</Container>
		</MainLayout>
	);
}

function TaskTimerSection() {
	return (
		<Card
			shadow="bigger"
			className={clsxm(
				'w-full flex lg:flex-row flex-col-reverse justify-between items-center mt-6',
				'border dark:border-[#28292F] dark:shadow-lg dark:bg-[#1B1D22]'
			)}
		>
			{/* Task inputs */}
			<div className="flex-1 flex flex-col mr-10 lg:mt-0 mt-8">
				<TaskInput />

				<div className="flex flex-col lg:flex-row justify-between items-center space-x-3">
					<div className="flex space-x-3 lg:mb-0 mb-4">
						<span className="text-gray-500 font-normal">Estimate:</span>
						<TaskEstimate />
					</div>

					<div className="flex-1 flex justify-between space-x-3">
						<TaskStatusDropdown className="lg:min-w-[170px]" />
						<TaskPropertiesDropdown className="lg:min-w-[170px]" />
						<TaskSizesDropdown className="lg:min-w-[170px]" />
						<TaskDevicesDropdown className="lg:min-w-[170px]" />
					</div>
				</div>
			</div>

			{/* Timer  */}
			<Timer />
		</Card>
	);
}

export default withAuthentication(MainPage, { displayName: 'MainPage' });
