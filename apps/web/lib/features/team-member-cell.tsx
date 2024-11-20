import { useTeamMemberCard, useTMCardTaskEdit, useCollaborative } from '@app/hooks';
import { OT_Member } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { InputField } from 'lib/components';
import { TaskTimes } from './task/task-times';
import { TaskEstimateInfo } from './team/user-team-card/task-estimate';
import { TaskInfo } from './team/user-team-card/task-info';
import { UserInfo } from './team/user-team-card/user-info';
import { UserTeamCardMenu } from './team/user-team-card/user-team-card-menu';
import get from 'lodash/get';
import { useAtomValue } from 'jotai';
import { fullWidthState } from '@app/stores/fullWidth';

export function TaskCell({ row }: { row: any }) {
	const member = row.original as OT_Member;
	const memberInfo = useTeamMemberCard(member);
	const taskEdition = useTMCardTaskEdit(memberInfo.memberTask);
	const publicTeam = false;
	const fullWidth = useAtomValue(fullWidthState);

	return (
		<TaskInfo
			edition={taskEdition}
			memberInfo={memberInfo}
			className={clsxm(
				'flex-1 flex justify-center items-center px-2',
				fullWidth ? 'max-w-[24rem]' : 'max-w-[20rem]'
			)}
			publicTeam={publicTeam}
		/>
	);
}

export function UserInfoCell({ cell }: Readonly<{ cell: any }>) {
	const row = get(cell, 'row', {});
	const member = row.original as OT_Member;
	const publicTeam = get(cell, 'column.columnDef.meta.publicTeam', false);
	const memberInfo = useTeamMemberCard(member);

	return <UserInfo memberInfo={memberInfo} className="w-fit" publicTeam={publicTeam} />;
}

export function WorkedOnTaskCell({ row }: { row: any }) {
	const member = row.original as OT_Member;
	const memberInfo = useTeamMemberCard(member);

	return (
		<TaskTimes
			activeAuthTask={true}
			memberInfo={memberInfo}
			task={memberInfo.memberTask}
			isAuthUser={memberInfo.isAuthUser}
			className={clsxm('flex flex-col justify-center items-center mx-auto')}
		/>
	);
}

export function TaskEstimateInfoCell({ row }: { row: any }) {
	const member = row.original as OT_Member;
	const memberInfo = useTeamMemberCard(member);
	const taskEdition = useTMCardTaskEdit(memberInfo.memberTask);

	return (
		<TaskEstimateInfo
			memberInfo={memberInfo}
			edition={taskEdition}
			activeAuthTask={true}
			className={clsxm('flex flex-col justify-center items-center')}
		/>
	);
}

export function ActionMenuCell({ cell }: { cell: any }) {
	const row = get(cell, 'row', {});
	const member = row.original as OT_Member;
	const active = get(cell, 'column.columnDef.meta.active', false);
	const memberInfo = useTeamMemberCard(member);

	const { collaborativeSelect, user_selected, onUserSelect } = useCollaborative(memberInfo.memberUser);
	const taskEdition = useTMCardTaskEdit(memberInfo.memberTask);

	return (
		<>
			{(!collaborativeSelect || active) && <UserTeamCardMenu memberInfo={memberInfo} edition={taskEdition} />}

			{collaborativeSelect && !active && (
				<InputField
					type="checkbox"
					checked={user_selected()}
					className={clsxm(
						'border-none w-4 h-4 mr-1 accent-primary-light',
						'border-2 border-primary-light',
						'2xl:w-[2rem] w-1/5'
					)}
					noWrapper={true}
					onChange={onUserSelect}
				/>
			)}
		</>
	);
}
