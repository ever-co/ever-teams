import clsx from 'clsx';
import TaskLabel from './task-label';

type TaskRowProps = {
	labelPath?: string;
	labelTitle: string;
	children?: JSX.Element | JSX.Element[];
	wrapperClassName?: string;
	alignWithIconLabel?: boolean;
};

const TaskRow: React.FC<TaskRowProps> = ({
	children,
	labelPath,
	labelTitle,
	wrapperClassName,
	alignWithIconLabel,
}) => {
	return (
		<div className={clsx('flex justify-between', wrapperClassName)}>
			<div className="flex items-top w-[47%]">
				<TaskLabel
					iconSrc={labelPath}
					label={labelTitle}
					alignWithIconLabel={alignWithIconLabel}
				/>
			</div>
			<div className="w-[47%]">
				<div className="flex">{children}</div>
			</div>
		</div>
	);
};

export default TaskRow;
