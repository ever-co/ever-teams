import { ITimerSlot } from '@app/interfaces/timer/ITimerSlot';
import { pad } from './number';
import { ITimerApps } from '@app/interfaces/timer/ITimerApp';
export function groupDataByHour(data: ITimerSlot[]) {
	const groupedData: { startedAt: string; stoppedAt: string; items: ITimerSlot[] }[] = [];

	data.forEach((item) => {
		const startHour = formatTime(item.startedAt, false);

		const inInterval = groupedData.findIndex((el) => {
			return el.startedAt == startHour;
		});

		if (inInterval !== -1) {
			groupedData[inInterval].items.push(item);
		} else {
			groupedData.push({
				startedAt: formatTime(item.startedAt, false),
				stoppedAt: formatTime(item.startedAt, true),
				items: [item]
			});
		}
	});

	return groupedData.sort((a, b) => (new Date(a.stoppedAt) < new Date(b.stoppedAt) ? 1 : -1));
}

export function groupAppsByHour(apps: ITimerApps[]) {
	const groupedData: { hour: string; totalMilliseconds: number; apps: ITimerApps[] }[] = [];

	apps.forEach((app) => {
		const time = app.time.slice(0, 5);

		const hourDataIndex = groupedData.findIndex((el) => el.hour == time);

		if (hourDataIndex !== -1) {
			groupedData[hourDataIndex].apps.push(app);
			groupedData[hourDataIndex].totalMilliseconds += +app.duration;
		} else
			groupedData.push({
				hour: app.time.slice(0, 5),
				totalMilliseconds: +app.duration,
				apps: [app]
			});
	});

	return groupedData.sort((a, b) => (new Date(a.hour) > new Date(b.hour) ? 1 : -1));
}

const formatTime = (d: Date | string, addHour: boolean) => {
	d = d instanceof Date ? d : new Date(d);
	if (addHour)
		return `${new Date(d).getHours() < 10 ? pad(new Date(d).getHours() + 1) : new Date(d).getHours() + 1}:00`;
	else return `${new Date(d).getHours() < 10 ? pad(new Date(d).getHours()) : new Date(d).getHours()}:00`;
};
