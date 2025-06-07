import { IActivity } from '@/core/types/interfaces/activity/activity';
import { pad } from './number';
import { ITimeSlot } from '@/core/types/interfaces/timer/time-slot/time-slot';
import { TActivity } from '@/core/types/schemas';
export function groupDataByHour(data: ITimeSlot[]) {
	const groupedData: { startedAt: string; stoppedAt: string; items: ITimeSlot[] }[] = [];

	data.forEach((item) => {
		const startHour = formatTime(String(item.startedAt), false);

		const inInterval = groupedData.findIndex((el) => {
			return el.startedAt == startHour;
		});

		if (inInterval !== -1) {
			groupedData[inInterval].items.push(item);
		} else {
			groupedData.push({
				startedAt: formatTime(String(item.startedAt), false),
				stoppedAt: formatTime(String(item.stoppedAt), true),
				items: [item]
			});
		}
	});

	return groupedData.sort((a, b) => (new Date(a.stoppedAt) < new Date(b.stoppedAt) ? 1 : -1));
}

export function groupAppsByHour(apps: IActivity[]) {
	const groupedData: { hour: string; totalMilliseconds: number; apps: IActivity[] }[] = [];

	apps.forEach((app) => {
		const time = app.time.slice(0, 5);

		const hourDataIndex = groupedData.findIndex((el) => el.hour == time);

		if (app.duration)
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

	return groupedData.sort((a, b) => (new Date(a.hour) > new Date(b.hour) ? -1 : 1));
}

export function groupByTime(data: TActivity[]) {
	const groupedData: { date: string; items: TActivity[] }[] = [];

	data.forEach((item) => {
		const date = new Date(item.date).toDateString();

		const dateDataIndex = groupedData.findIndex((el) => el.date == date);

		if (dateDataIndex !== -1) {
			groupedData[dateDataIndex].items.push(item);
		} else
			groupedData.push({
				date,
				items: [item]
			});
	});

	return groupedData.sort((a, b) => (new Date(a.date) > new Date(b.date) ? -1 : 1));
}

const formatTime = (d: Date | string, addHour: boolean) => {
	d = d instanceof Date ? d : new Date(d);
	if (addHour)
		return `${new Date(d).getHours() < 10 ? pad(new Date(d).getHours() + 1) : new Date(d).getHours() + 1}:00`;
	else return `${new Date(d).getHours() < 10 ? pad(new Date(d).getHours()) : new Date(d).getHours()}:00`;
};

/**
 * Groups an array of items by the key returned by the `key` function.
 *
 * @example
 * const items = [
 *     { id: 1, name: 'John', group: 'A' },
 *     { id: 2, name: 'Jane', group: 'A' },
 *     { id: 3, name: 'Bob', group: 'B' },
 * ];
 *
 * const groupedItems = groupBy(items, item => item.group);
 *
 * // groupedItems = {
 * //     A: [{ id: 1, name: 'John', group: 'A' }, { id: 2, name: 'Jane', group: 'A' }],
 * //     B: [{ id: 3, name: 'Bob', group: 'B' }]
 * // }
 *
 * @param array The array of items to group.
 * @param key A function that takes an item and returns a key to group by.
 * @returns An object where the keys are the unique values of the key function and the values are arrays of items.
 */
export const groupBy = <T, K extends keyof any>(array: T[], key: (item: T) => K): Record<K, T[]> =>
	array.reduce(
		(acc, item) => {
			const groupKey = key(item);
			(acc[groupKey] ||= []).push(item);
			return acc;
		},
		{} as Record<K, T[]>
	);
