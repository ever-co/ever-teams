import { useRecoilState } from 'recoil';
import TaskRow from '../components/task-row';
import { detailedTaskState } from '@app/stores';
import ProfileInfoWithTime from '../components/profile-info-with-time';
import { TaskEstimate } from 'lib/features';
import { AddIcon } from 'lib/components/svgs';
import { ChevronUpIcon } from '@heroicons/react/20/solid';
import { Disclosure } from '@headlessui/react';
import clsx from 'clsx';
import { useTranslation } from 'lib/i18n';

const TaskEstimationsInfo = () => {
	const [task] = useRecoilState(detailedTaskState);

	const { trans } = useTranslation('taskDetails');

	return (
		<section className="flex flex-col p-[15px]">
			<TaskRow
				labelTitle={trans.ESTIMATIONS}
				afterIconPath="/assets/svg/estimations.svg"
				wrapperClassName="mb-3"
			>
				<Disclosure>
					{({ open }) => (
						<div className="flex flex-col w-full">
							<Disclosure.Button className="flex justify-between items-center w-full">
								<TaskEstimate
									_task={task}
									className="not-italic font-semibold text-xs leading-[140%] tracking-[-0.02em] text-[#282048] dark:text-white"
									wrapperClassName="w-4"
								/>

								<ChevronUpIcon
									className={clsx(
										open ? 'rotate-180 transform' : '',
										'h-5 w-5 text-[#A5A2B2]'
									)}
								/>
							</Disclosure.Button>
							<Disclosure.Panel>
								{task?.members.map((member) => (
									<ProfileInfoWithTime
										key={member.id}
										profilePicSrc={member.user?.imageUrl}
										names={member.fullName}
										profileInfoWrapperClassName="mt-4"
										//@ts-ignore
										time={
											<TaskEstimate
												_task={task}
												className="not-italic font-medium text-xs tracking-[-0.02em] !text-[#938FA3] dark:text-white mt-4"
												wrapperClassName="w-4"
											/>
										}
									/>
								))}
								<div className="mt-4">
									<button className="flex items-center text-[0.625rem] leading-[140%] border py-1.5 rounded-xl px-2 text-[#292D32] font-semibold dark:text-white">
										<AddIcon className="dark:stroke-white" />
										Add new member
									</button>
								</div>
							</Disclosure.Panel>
						</div>
					)}
				</Disclosure>
			</TaskRow>

			<hr className="text-[#F2F2F2] mt-[15px]" />
		</section>
	);
};

export default TaskEstimationsInfo;
