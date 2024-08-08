import { type ClassValue, clsx } from 'clsx';
import moment from 'moment';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function range(start: number, end?: number, step = 1): number[] {
	const result: number[] = [];

	if (step === 0) {
		throw new Error('Step cannot be zero.');
	}

	if (end === undefined) {
		end = start;
		start = 0;
	}

	if ((start < end && step < 0) || (start > end && step > 0)) {
		return result; // Empty array for invalid input.
	}

	for (let i = start; step > 0 ? i < end : i > end; i += step) {
		result.push(i);
	}

	return result;
}

export function chunk<T>(array: T[], size: number): T[][] {
	if (size <= 0) {
		throw new Error('Size must be greater than zero.');
	}

	const result: T[][] = [];
	for (let i = 0; i < array.length; i += size) {
		result.push(array.slice(i, i + size));
	}

	return result;
}

export const shortenLink = (value: any): string => {
	if (typeof value !== 'string' || value.length <= 19) {
		return value;
	}
	const start = value.substring(0, window.location.origin.length);
	const end = value.substring(value.length - 10);
	return `${start}...${end}`;
};

export function formatWithSuffix(date: Date) {
	const day = moment(date).date();
	const suffix =
		day === 1 || day === 21 || day === 31
			? 'st'
			: day === 2 || day === 22
				? 'nd'
				: day === 3 || day === 23
					? 'rd'
					: 'th';
	return moment(date).format(`D[${suffix}] MMMM YYYY`);
}

export function checkPastDate(dateToBeChecked?: Date): boolean {
	if (dateToBeChecked) {
		const todayDate = new Date(new Date().toUTCString());
		const date = new Date(new Date(dateToBeChecked).toUTCString());

		date.setHours(0, 0, 0, 0);
		todayDate.setHours(0, 0, 0, 0);

		console.log(todayDate, date);

		return todayDate > date;
	} else {
		return false; // Return false if dateToBeChecked is not provided or is null or undefined.
	}
}
