import browser from '~misc/browser';
import { MessageTypesFromBackgroundEnum, MessageTypesToBackgroundEnum } from '~typescript/enums/MessageTypesEnum';
import { TimerStateEnum } from '~typescript/enums/TimerStateEnum';
import type { IPostMessage } from '~typescript/interfaces/PostMessage';
import type { ITimerTask } from '~typescript/types/Tasks';

let tasks: ITimerTask[] = [];
let activeTaskIndex: number | null = null;
let timeout: ReturnType<typeof setTimeout> | null = null;
let runState: TimerStateEnum = TimerStateEnum.stopped;
let interval = 1000; // ms
let workPort: chrome.runtime.Port | null = null;

browser.runtime.onConnect.addListener((port) => {
	workPort = port;
	let expected = Date.now() + interval;

	function postUpdateTask() {
		const activeTask = tasks[activeTaskIndex];
		if (workPort) {
			const totalWorked = tasks.reduce((a, v) => v.timer + a, 0);
			workPort.postMessage({
				type: MessageTypesFromBackgroundEnum.taskUpdate,
				payload: {
					id: activeTask ? activeTask.id : null,
					timer: activeTask ? activeTask.timer : 0,
					runState: activeTask ? runState : TimerStateEnum.paused,
					totalWorked
				}
			});
		}
	}

	if (tasks.length > 0 && activeTaskIndex !== null && tasks[activeTaskIndex]) {
		postUpdateTask();
	}

	function step() {
		if (tasks.length > 0 && activeTaskIndex !== null && tasks[activeTaskIndex]) {
			let dt = Date.now() - expected; // the drift (positive for overshooting)
			if (dt > interval) {
				// something awful happened. Maybe the browser (tab) was inactive?
				// possibly special handling to avoid futile "catch up" run
			}
			tasks[activeTaskIndex].timer += 1;
			postUpdateTask();

			expected += interval;
			timeout = setTimeout(step, interval); // take into account drift
		}
	}

	port.onDisconnect.addListener(() => {
		workPort = null;
		timeout = null;
	});

	port.onMessage.addListener((msg: IPostMessage) => {
		if (activeTaskIndex !== null) {
			if (msg.type === MessageTypesToBackgroundEnum.startTimer && runState !== TimerStateEnum.running) {
				timeout = setTimeout(step, interval);
				runState = TimerStateEnum.running;
			}
			if (msg.type === MessageTypesToBackgroundEnum.pauseTimer) {
				clearTimeout(timeout);
				timeout = null;
				runState = TimerStateEnum.paused;
			}
			if (msg.type === MessageTypesToBackgroundEnum.stopTimer) {
				clearTimeout(timeout);
				timeout = null;
				tasks[activeTaskIndex].timer = 0;
				runState = TimerStateEnum.stopped;
			}
		}

		if (msg.type === MessageTypesToBackgroundEnum.updateTasks && msg.payload && Array.isArray(msg.payload)) {
			tasks = msg.payload.map((x) => {
				const element = tasks.find((y) => y.id === x.id);

				return element ? element : { id: x.id, timer: 0 };
			});
		}
		if (msg.type == MessageTypesToBackgroundEnum.updateActiveTaskIndex) {
			const index = tasks.findIndex((x) => x.id === msg.payload.id);

			if (index !== -1) {
				activeTaskIndex = index;
				postUpdateTask();
			}
		}
	});
});
export {};
