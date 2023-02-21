import { secondsToTime } from '@app/helpers';
import { I_TeamMemberCardHook, I_TMCardTaskEditHook } from '@app/hooks';
import { IClassName } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Text } from 'lib/components';
import { EditIcon } from 'lib/components/svgs';
import { TaskEstimate, TaskProgressBar } from 'lib/features';
import { useTranslation } from 'lib/i18n';
import { useRef } from 'react';

type Props = IClassName & {
	memberInfo: I_TeamMemberCardHook;
	edition: I_TMCardTaskEditHook;
	activeAuthTask: boolean;
};

export function PublicTaskEstimateInfo({
	className,
	activeAuthTask,
	...rest
}: Props) {
	return (
		<div className={className}>
			<div className="flex items-center flex-col space-y-2">
				<PublicTaskEstimateInput {...rest} />

				<TaskProgressBar
					task={rest.edition.task}
					isAuthUser={rest.memberInfo.isAuthUser}
					activeAuthTask={activeAuthTask}
				/>
			</div>
		</div>
	);
}

function PublicTaskEstimateInput({
	memberInfo,
	edition,
}: Omit<Props, 'className' | 'activeAuthTask'>) {
	const { trans } = useTranslation();
	const loadingRef = useRef<boolean>(false);
	const task = memberInfo.memberTask;

	const hasEditMode = edition.estimateEditMode && task;

	const closeFn = () => {
		setTimeout(() => {
			!loadingRef.current && edition.setEstimateEditMode(false);
		}, 1);
	};
	edition.estimateEditIgnoreElement.onOutsideClick(closeFn);

	const { h, m } = secondsToTime(task?.estimate || 0);

	return (
		<>
			<div
				className={clsxm(!hasEditMode && ['hidden'])}
				ref={edition.estimateEditIgnoreElement.ignoreElementRef}
			>
				{task && (
					<TaskEstimate
						_task={task}
						loadingRef={loadingRef}
						closeable_fc={closeFn}
					/>
				)}
			</div>

			<div
				className={clsxm(
					'flex space-x-2 items-center mb-2 font-normal text-sm',
					hasEditMode && ['hidden']
				)}
			>
				<span className="text-gray-500">{trans.common.ESTIMATED}:</span>
				<Text>
					{h}h {m}m
				</Text>

				{(memberInfo.isAuthUser || memberInfo.isAuthTeamManager) && (
					<button
						ref={edition.estimateEditIgnoreElement.targetEl}
						onClick={() => task && edition.setEstimateEditMode(true)}
					>
						<EditIcon
							className={clsxm(
								'cursor-pointer',
								!task && ['opacity-40 cursor-default']
							)}
						/>
					</button>
				)}
			</div>
		</>
	);
}
