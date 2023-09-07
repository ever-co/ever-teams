import { type ClassValue, clsx } from 'clsx';
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
