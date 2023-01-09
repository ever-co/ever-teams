import { clsxm } from '@app/utils';
import { Breadcrumb, Card, Container, InputField } from 'lib/components';
import { Timer } from 'lib/features';
import { MainLayout } from 'lib/layout';

export default function MainPage() {
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
						<div className="flex-1 mr-10">
							<TaskInput />
						</div>
						<Timer />
					</Card>
				</Container>
			</div>
		</MainLayout>
	);
}

function TaskInput() {
	return (
		<>
			<InputField placeholder="What you working on?" />
		</>
	);
}
