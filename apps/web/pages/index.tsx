import { clsxm } from '@app/utils';
import { withAuthentication } from 'lib/app/authenticator';
import { Breadcrumb, Card, Container } from 'lib/components';
import { TaskEstimate, TaskInput, Timer } from 'lib/features';
import { MainLayout } from 'lib/layout';

function MainPage() {
	return (
		<MainLayout>
			<div className="bg-white dark:bg-dark--theme pt-16 -mt-8 pb-4">
				<Container>
					<Breadcrumb paths={['Dashboard', 'Team Page']} className="text-sm" />

					<Card
						shadow="bigger"
						className={clsxm(
							'w-full flex justify-between items-center mt-6',
							'border dark:border-[#28292F] dark:shadow-lg dark:bg-[#1B1D22]'
						)}
					>
						<div className="flex-1 flex flex-col mr-10">
							<TaskInput />

							<div className="flex justify-between items-center">
								<div className="flex space-x-3">
									<span className="text-gray-500 font-normal">Estimate:</span>
									<TaskEstimate />
								</div>
							</div>
						</div>
						<Timer />
					</Card>
				</Container>
			</div>
		</MainLayout>
	);
}

export default withAuthentication(MainPage, { displayName: 'MainPage' });
