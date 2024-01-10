import { ITimerSlot } from '@app/interfaces/timer/ITimerSlot';
import { pad } from './number';
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

const formatTime = (d: Date | string, addHour: boolean) => {
	d = d instanceof Date ? d : new Date(d);
	if (addHour)
		return `${new Date(d).getHours() < 10 ? pad(new Date(d).getHours()) + 1 : new Date(d).getHours() + 1}:00`;
	else return `${new Date(d).getHours() < 10 ? pad(new Date(d).getHours()) : new Date(d).getHours()}:00`;
};
