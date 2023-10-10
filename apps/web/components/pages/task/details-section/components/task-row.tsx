import clsx from 'clsx';
import { PropsWithChildren } from 'react';
import TaskLabel from './task-label';

type TaskRowProps = {
	labelIconPath?: string;
	afterIconPath?: string;
	labelTitle?: string;
	children?: JSX.Element | JSX.Element[];
	wrapperClassName?: string;
	alignWithIconLabel?: boolean;
};

const TaskRow = ({
	children,
	labelIconPath,
	afterIconPath,
	labelTitle,
	wrapperClassName,
	alignWithIconLabel
}: PropsWithChildren<TaskRowProps>) => {
	return (
		<div className={clsx('flex', wrapperClassName)}>
			<div className="flex items-top w-[40%]">
				<TaskLabel
					labelIconPath={labelIconPath}
					labelTitle={labelTitle}
					afterIconPath={afterIconPath}
					alignWithIconLabel={alignWithIconLabel}
				/>
			</div>
			<div className="w-[56%]">
				<div className="flex">{children}</div>
			</div>
		</div>
	);
};

export default TaskRow;
