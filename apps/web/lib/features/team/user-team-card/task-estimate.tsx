import { secondsToTime } from '@app/helpers';
import {
	I_TeamMemberCardHook,
	I_TMCardTaskEditHook,
	useTaskStatistics,
} from '@app/hooks';
import { IClassName } from '@app/interfaces';
import { timerSecondsState } from '@app/stores';
import { clsxm } from '@app/utils';
import { ProgressBar, Text } from 'lib/components';
import { EditIcon } from 'lib/components/svgs';
import { TaskEstimate } from 'lib/features';
import { useRef } from 'react';
import { useRecoilValue } from 'recoil';

type Props = IClassName & {
	memberInfo: I_TeamMemberCardHook;
	edition: I_TMCardTaskEditHook;
};

export function TaskEstimateInfo({ className, ...rest }: Props) {
	return (
		<div className={className}>
			<div className="flex items-center flex-col space-y-2">
				<TaskEstimateInput {...rest} />

				<ProgressBarItem {...rest} />
			</div>
		</div>
	);
}

function TaskEstimateInput({ memberInfo, edition }: Omit<Props, 'className'>) {
	const loadingRef = useRef<boolean>(false);

	const closeFn = () => {
		setTimeout(() => {
			!loadingRef.current && edition.setEstimateEditMode(false);
		}, 1);
	};

	edition.estimateEditIgnoreElement.onOutsideClick(closeFn);

	const { h, m } = secondsToTime(edition.task?.estimate || 0);
	return (
		<>
			<div
				className={clsxm(!edition.estimateEditMode && ['hidden'])}
				ref={edition.estimateEditIgnoreElement.ignoreElementRef}
			>
				<TaskEstimate
					_task={memberInfo.memberTask}
					loadingRef={loadingRef}
					closeable_fc={closeFn}
				/>
			</div>

			<div
				className={clsxm(
					'flex space-x-2 items-center mb-2 font-normal text-sm',
					edition.estimateEditMode && ['hidden']
				)}
			>
				<span className="text-gray-500">Estimated:</span>
				<Text>
					{h}h {m}m
				</Text>
				<button
					ref={edition.estimateEditIgnoreElement.targetEl}
					onClick={() => edition.setEstimateEditMode(true)}
				>
					<EditIcon className="cursor-pointer" />
				</button>
			</div>
		</>
	);
}

function ProgressBarItem({ memberInfo, edition }: Omit<Props, 'className'>) {
	const seconds = useRecoilValue(timerSecondsState);
	const { activeTaskEstimation, getTaskStat, getEstimation } =
		useTaskStatistics(memberInfo.isAuthUser ? seconds : 0);

	let progress = activeTaskEstimation;

	if (!memberInfo.isAuthUser) {
		const { taskTotalStat } = getTaskStat(edition.task);
		progress = getEstimation(taskTotalStat, edition.task, 0);
	}

	return <ProgressBar width="100%" progress={`${progress}%`} />;
}
