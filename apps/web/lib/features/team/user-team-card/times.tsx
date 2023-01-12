import { IClassName } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Text } from 'lib/components';

export function TaskTime({ className }: IClassName) {
	return (
		<div className={clsxm(className)}>
			<div className="flex space-x-2 items-center mb-2 font-normal">
				<span className="text-gray-500">Today:</span>
				<Text>00h : 30m</Text>
			</div>
			<div className="flex space-x-2 items-center text-sm font-normal">
				<span className="text-gray-500">Total:</span>
				<Text>20h : 30m</Text>
			</div>
		</div>
	);
}

export function TodayWorkedTime({ className }: IClassName) {
	return (
		<div className={clsxm('text-center font-normal', className)}>
			<Text>01 h : 10 m</Text>
		</div>
	);
}
