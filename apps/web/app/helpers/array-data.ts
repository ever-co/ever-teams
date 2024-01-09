import { ITimerSlot } from '@app/interfaces/timer/ITimerSlot';

export function groupDataByHour(data: ITimerSlot[]) {
	const groupedData: { startedAt: Date; stoppedAt: Date; items: ITimerSlot[] }[] = [];

	data.forEach((item) => {
		const inIntervall = groupedData.findIndex(
			(el) => el.startedAt < item.startedAt && el.stoppedAt >= item.stoppedAt
		);

		if (inIntervall) groupedData[inIntervall].items.push(item);
		else
			groupedData.push({
				startedAt: new Date(item.startedAt),
				stoppedAt: new Date(item.stoppedAt),
				items: [item]
			});
	});

	return groupedData.sort((a, b) => (new Date(a.stoppedAt) > new Date(b.stoppedAt) ? 1 : -1));
}
