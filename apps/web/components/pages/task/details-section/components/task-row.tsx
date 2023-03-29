import clsx from 'clsx';
import TaskLabel from './task-label';

type TaskRowProps = {
	labelIconPath?: string;
	afterIconPath?: string;
	labelTitle?: string;
	children?: JSX.Element | JSX.Element[];
	wrapperClassName?: string;
	alignWithIconLabel?: boolean;
};

const TaskRow: React.FC<TaskRowProps> = ({
	children,
	labelIconPath,
	afterIconPath,
	labelTitle,
	wrapperClassName,
	alignWithIconLabel,
}) => {
	return (
		<div className={clsx('flex xl:justify-between', wrapperClassName)}>
			<div className="flex items-top w-[47%]">
				<TaskLabel
					labelIconPath={labelIconPath}
					labelTitle={labelTitle}
					afterIconPath={afterIconPath}
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
