import { detailedTaskState } from '@app/stores';
import { TaskProgressBar } from 'lib/features';
import { useRecoilState } from 'recoil';
import TaskRow from '../components/task-row';
import { Disclosure } from '@headlessui/react';
import { useEffect, useState } from 'react';
import ProfileInfoWithTime from '../components/profile-info-with-time';
import { IEmployee } from '@app/interfaces';
import { ChevronUpIcon } from '@heroicons/react/20/solid';
import clsx from 'clsx';

const TaskProgress = () => {
	const [task] = useRecoilState(detailedTaskState);
	const [dummyProfiles, setDummyProfiles] = useState<IEmployee[]>([]);

	useEffect(() => {
		if (task && task?.members) {
			const profiles = Array.isArray(task?.members) ? [...task.members] : [];

			console.log(profiles);

			if (profiles) {
				profiles.push(profiles[0]);
				profiles.push(profiles[0]);
				profiles.push(profiles[0]);
			}

			setDummyProfiles(profiles);
		}
	}, [task]);

	return (
		<section className="flex flex-col p-[15px]">
			<TaskRow labelTitle="Progress" wrapperClassName="mb-3">
				<TaskProgressBar task={task} isAuthUser={true} activeAuthTask={true} />
			</TaskRow>
			<TaskRow labelTitle="Total Time" wrapperClassName="mb-3">
				<div className="not-italic font-semibold text-xs leading-[140%] tracking-[-0.02em] text-[#282048]">
					2h : 12m
				</div>
			</TaskRow>
			<TaskRow labelTitle="Time Today" wrapperClassName="mb-3">
				<div className="not-italic font-semibold text-xs leading-[140%] tracking-[-0.02em] text-[#282048]">
					1h : 10m
				</div>
			</TaskRow>
			<TaskRow labelTitle="Total Group time" wrapperClassName="mb-3">
				<Disclosure>
					{({ open }) => (
						<div className="flex flex-col w-full">
							<Disclosure.Button className="flex justify-between items-center w-full">
								<div className="not-italic font-semibold text-xs leading-[140%] tracking-[-0.02em] text-[#282048]">
									9h : 11m
								</div>
								<ChevronUpIcon
									className={clsx(
										open ? 'rotate-180 transform' : '',
										'h-5 w-5 text-[#292D32]'
									)}
								/>
							</Disclosure.Button>
							<Disclosure.Panel>
								{dummyProfiles?.map((profile) => (
									<div key={profile.id} className="mt-2.5">
										<ProfileInfoWithTime
											profilePicSrc={profile.user?.imageUrl}
											names={profile.fullName}
											time=" 3h : 4m"
										/>
									</div>
								))}
							</Disclosure.Panel>
						</div>
					)}
				</Disclosure>
			</TaskRow>
			<TaskRow labelTitle="Time Remains">
				<div className="not-italic font-semibold text-xs leading-[140%] tracking-[-0.02em] text-[#282048]">
					2h : 12m
				</div>
			</TaskRow>
		</section>
	);
};

export default TaskProgress;
