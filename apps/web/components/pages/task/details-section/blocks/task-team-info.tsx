import { StatusDropdown } from 'lib/features';
import TaskRow from '../components/task-row';
import { useRecoilState } from 'recoil';
import { detailedTaskState } from '@app/stores';

const TaskTeamInfo = () => {
	const [task] = useRecoilState(detailedTaskState);

	return (
		<section className="flex flex-col p-[15px]">
			<TaskRow labelTitle="Project" wrapperClassName="mb-3">
				<StatusDropdown
					className={'lg:min-w-[170px]'}
					items={[]}
					value={undefined}
					forDetails={true}
					defaultItem={'project'}
					onChange={() => void 0}
				/>
			</TaskRow>
			<TaskRow labelTitle="Team" wrapperClassName="mb-3">
				<StatusDropdown
					className={'lg:min-w-[170px]'}
					items={[]}
					value={undefined}
					forDetails={true}
					defaultItem={'team'}
					onChange={() => void 0}
				/>
			</TaskRow>
		</section>
	);
};

export default TaskTeamInfo;
