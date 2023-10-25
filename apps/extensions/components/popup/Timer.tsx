import classNames from 'classnames';
import React, { useEffect, useState } from 'react';

import browser from '~misc/browser';
import { MessageTypesFromBackgroundEnum, MessageTypesToBackgroundEnum } from '~typescript/enums/MessageTypesEnum';
import { TimerStateEnum } from '~typescript/enums/TimerStateEnum';
import type { IPostMessage } from '~typescript/interfaces/PostMessage';
import type { ITimerUpdate } from '~typescript/interfaces/TimerUpdate';

interface Props {
	port: chrome.runtime.Port | null;
}
const Timer: React.FC<Props> = ({ port }) => {
	const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
	const [timeString, setTimeString] = useState<string>('00:00:00');
	const [totalWorked, setTotalWorked] = useState<string>('00:00:00');
	const [isRunning, setIsRunning] = useState<boolean>(false);

	useEffect(() => {
		if (port) {
			port.onMessage.addListener((msg: IPostMessage<ITimerUpdate>) => {
				if (msg.type === MessageTypesFromBackgroundEnum.taskUpdate) {
					if (msg.payload.id !== null) {
						const taskWorkedTime =
							msg.payload.timer && msg.payload.timer > 0
								? new Date(msg.payload.timer * 1000).toISOString().substr(11, 8)
								: '00:00:00';
						const totalWorkedTime =
							msg.payload.totalWorked > 0
								? new Date(msg.payload.totalWorked * 1000).toISOString().substr(11, 8)
								: '00:00:00';
						setTimeString(taskWorkedTime);
						setActiveTaskId(msg.payload.id);
						setTotalWorked(totalWorkedTime);
						setIsRunning(msg.payload.runState === TimerStateEnum.running);
					}
				} else {
					setTimeString('00:00:00');
					setActiveTaskId(null);
					setIsRunning(false);
				}
			});
		}
	}, [port]);

	const startTimer = async () => {
		setIsRunning(true);
		port.postMessage({ type: MessageTypesToBackgroundEnum.startTimer });
	};

	const pauseTimer = async () => {
		setIsRunning(false);
		port.postMessage({ type: MessageTypesToBackgroundEnum.pauseTimer });
	};

	return (
		<>
			{/* timer */}
			<div className="my-12 text-center">
				<span className="text-xl p-4 bg-slate-900 rounded-xl text-white">{timeString}</span>
			</div>

			{/* timerControls */}
			<div className="flex flex-col">
				<div className="flex justify-between mb-2">
					<span>
						Total worked today:
						<b>{totalWorked}</b>
					</span>
					<a>Check team</a>
				</div>
				<button
					disabled={activeTaskId === null}
					className={classNames(
						'p-2 text-lg bg-slate-800 rounded-lg text-white outline-none',
						activeTaskId === null ? 'bg-gray-400 cursor-not-allowed' : ''
					)}
					onClick={!isRunning ? startTimer : pauseTimer}>
					{!isRunning ? 'Start' : 'Pause'}
				</button>
			</div>
		</>
	);
};

export default Timer;
