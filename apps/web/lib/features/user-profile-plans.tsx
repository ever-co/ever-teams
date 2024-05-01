import { useEffect } from 'react';
import { useRecoilState } from 'recoil';
import { useDailyPlan, useUserProfilePage } from '@app/hooks';
import { userState } from '@app/stores';
import { TaskCard } from './task/task-card';

export function UserProfilePlans() {
	const profile = useUserProfilePage();
	const { dailyPlan, getEmployeeDayPlans } = useDailyPlan();
	const [user] = useRecoilState(userState);
	useEffect(() => {
		getEmployeeDayPlans(user?.employee.id ?? '');
	}, [getEmployeeDayPlans, user?.employee.id]);

	return (
		<div className="">
			<ul className="flex flex-col gap-6">
				{dailyPlan.items.map((plan) => (
					<li key={plan.id}>
						{plan.date.toString()}
						<ul className="flex flex-col gap-2">
							{plan.tasks?.map((task) => (
								<TaskCard
									key={`${task.id}${plan.id}`}
									isAuthUser={profile.isAuthUser}
									activeAuthTask={false}
									viewType={'dailyplan'}
									task={task}
									profile={profile}
									type="HORIZONTAL"
									taskBadgeClassName={`rounded-sm`}
									taskTitleClassName="mt-[0.0625rem]"
								/>
							))}
						</ul>
						{/**/}
					</li>
				))}
			</ul>
		</div>
	);
}
