import { useRecoilState } from 'recoil';
import TaskRow from '../components/task-row';
import { detailedTaskState } from '@app/stores';
import ProfileInfoWithTime from '../components/profile-info-with-time';

const TaskEstimationsInfo = () => {
	const [task] = useRecoilState(detailedTaskState);

	return (
		<section className="flex flex-col p-[15px]">
			<TaskRow
				labelTitle="Estimations"
				afterIconPath="/assets/svg/estimations.svg"
				wrapperClassName="mb-3"
			>
				<div className="not-italic font-semibold text-xs leading-[140%] tracking-[-0.02em] text-[#282048]">
					12h : 4m
				</div>
			</TaskRow>
			<TaskRow>
				{task?.members.map((member) => (
					<ProfileInfoWithTime
						key={member.id}
						profilePicSrc={member?.user?.imageUrl}
						names={member.fullName}
						time=" 12h : 4m"
					/>
				))}
			</TaskRow>
			<hr className="text-[#F2F2F2] mt-[15px]" />
		</section>
	);
};

export default TaskEstimationsInfo;
