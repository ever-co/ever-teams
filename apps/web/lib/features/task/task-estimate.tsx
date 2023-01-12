import { TimeInputField } from 'lib/components';

export function TaskEstimate() {
	return (
		<div className="flex items-center space-x-1">
			<TimeInputField defaultValue="00" label="h" />
			<span>:</span>
			<TimeInputField defaultValue="00" label="m" />
		</div>
	);
}
