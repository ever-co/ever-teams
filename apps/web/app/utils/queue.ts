import { wait } from './wait';

export class Queue {
	private running = false;
	private queues: (() => void)[] = [];

	constructor(private poolSize = 1) {}

	private _task(func: (...params: any) => void, ...params: any[]) {
		return () => func(...params);
	}

	public task<F extends any[], T extends (...params: F) => void>(
		func: T,
		...params: F
	) {
		this.queues.push(this._task(func, ...params));

		if (this.running === false) {
			this.running = true;
			wait(0.1).then(() => this.work());
		}
	}

	private async work() {
		const tasks = this.queues.splice(0, this.poolSize);
		if (tasks.length === 0) {
			this.running = false;
			return;
		}

		await Promise.allSettled(tasks.map((fn) => fn()));
		this.work();
	}
}
