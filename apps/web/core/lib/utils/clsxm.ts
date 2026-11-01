import clsx, { ClassValue } from 'clsx';
import { twMerge } from './tw-merge';

/** Merge classes with tailwind-merge with clsx full feature */
export function clsxm(...classes: ClassValue[]) {
	return twMerge(clsx(...classes));
}
