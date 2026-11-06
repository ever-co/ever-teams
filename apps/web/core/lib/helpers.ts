import { type ClassValue, clsx } from 'clsx';
import moment from 'moment';
import { twMerge } from './utils/tw-merge';
import React, { JSX, ReactNode } from 'react';
import { ETaskStatusName } from '../types/generics/enums/task';
import { getDailyPlanDay } from './helpers/daily-plan-day';
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

export function checkPastDate(dateToBeChecked?: Date | string): boolean {
	if (dateToBeChecked) {
		return getDailyPlanDay(dateToBeChecked) < moment().format('YYYY-MM-DD');
	} else {
		return false; // Return false if dateToBeChecked is not provided or is null or undefined.
	}
}
export function isJSXElement(node: any | ReactNode): node is JSX.Element | JSX.Element[] {
	if (React.isValidElement(node)) {
		return true;
	}

	if (Array.isArray(node)) {
		return node.every((item) => React.isValidElement(item));
	}

	return false;
}

const STATUS_CHIP_WARNING = 'bg-warning/10 text-warning-foreground hairline-ring ring-inset ring-warning/20';
const STATUS_CHIP_INFO = 'bg-info/10 text-info-foreground hairline-ring ring-inset ring-info/20';
const STATUS_CHIP_PRIMARY = 'bg-primary/10 text-primary-ink hairline-ring ring-inset ring-primary/20';
const STATUS_CHIP_DESTRUCTIVE = 'bg-destructive/10 text-destructive-ink hairline-ring ring-inset ring-destructive/20';
const STATUS_CHIP_SUCCESS = 'bg-success/10 text-success-foreground hairline-ring ring-inset ring-success/20';
const STATUS_CHIP_MUTED = 'bg-foreground/5 text-muted-foreground hairline-ring ring-inset ring-foreground/10';

export function getStatusColor(status: ETaskStatusName) {
	switch (status) {
		case 'in-review':
			return STATUS_CHIP_WARNING;
		case 'ready-for-review':
			return STATUS_CHIP_WARNING;
		case 'backlog':
			return STATUS_CHIP_MUTED;
		case 'open':
			return STATUS_CHIP_INFO;
		case 'in-progress':
			return STATUS_CHIP_PRIMARY;
		case 'blocked':
			return STATUS_CHIP_DESTRUCTIVE;
		case 'done':
			return STATUS_CHIP_SUCCESS;
		case 'completed':
			return STATUS_CHIP_SUCCESS;
		case 'custom':
			return STATUS_CHIP_SUCCESS;
		default:
			return STATUS_CHIP_MUTED;
	}
}
export function isServer() {
	return typeof window === 'undefined';
}
