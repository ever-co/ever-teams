import { secondsToTime } from '@app/helpers';
import { I_TeamMemberCardHook, I_TMCardTaskEditHook } from '@app/hooks';
import { IClassName } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Text } from 'lib/components';
import { EditIcon } from 'lib/components/svgs';
import { TaskEstimate, TaskProgressBar } from 'lib/features';
import { useRef } from 'react';

type Props = IClassName & {
	memberInfo: I_TeamMemberCardHook;
	edition: I_TMCardTaskEditHook;
};

export function TaskEstimateInfo({ className, ...rest }: Props) {
	return (
		<div className={className}>
			<div className="flex items-center flex-col space-y-2">
				<TaskEstimateInput {...rest} />

				<TaskProgressBar
					task={rest.edition.task}
					isAuthUser={rest.memberInfo.isAuthUser}
				/>
			</div>
		</div>
	);
}

function TaskEstimateInput({ memberInfo, edition }: Omit<Props, 'className'>) {
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
				<span className="text-gray-500">Estimated:</span>
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
