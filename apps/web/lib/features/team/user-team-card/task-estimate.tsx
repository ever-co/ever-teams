import { IClassName } from '@app/interfaces';
import { ProgressBar, Text } from 'lib/components';
import { EditIcon } from 'lib/components/svgs';

export function TaskEstimate({ className }: IClassName) {
	return (
		<div className={className}>
			<div className="flex items-center flex-col space-y-2">
				<div className="flex space-x-2 items-center mb-2 font-normal text-sm">
					<span className="text-gray-500">Estimated:</span>
					<Text>01h 30m</Text>
					<EditIcon />
				</div>

				<ProgressBar width="100%" progress="0%" />
			</div>
		</div>
	);
}
