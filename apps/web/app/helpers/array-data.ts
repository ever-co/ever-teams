import { ITimerSlot } from '@app/interfaces/timer/ITimerSlot';
export function groupDataByHour(data: ITimerSlot[]) {
	const groupedData: { startedAt: Date; stoppedAt: Date; items: ITimerSlot[] }[] = [];

	data.forEach((item) => {
		const startHour = new Date(item.startedAt).getHours();
		const stopHour = new Date(item.stoppedAt).getHours();

		const inInterval = groupedData.findIndex(
			(el) => new Date(el.startedAt).getHours() === startHour && new Date(el.stoppedAt).getHours() === stopHour
		);

		if (inInterval !== -1) {
			groupedData[inInterval].items.push(item);
		} else {
			groupedData.push({
				startedAt: new Date(item.startedAt),
				stoppedAt: new Date(item.stoppedAt),
				items: [item]
			});
		}
	});

	return groupedData.sort((a, b) => (new Date(a.stoppedAt) > new Date(b.stoppedAt) ? 1 : -1));
}
