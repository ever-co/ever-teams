import { IClassName } from '@app/interfaces';
import { clsxm } from '@app/utils';

type Props = {
	title?: string;
} & IClassName;

export function TaskItem({ title, className }: Props) {
	return (
		<div className={clsxm('flex', className)}>
			<div className="font-normal text-sm overflow-hidden text-ellipsis">
				{title}
			</div>

			<div></div>
		</div>
	);
}
