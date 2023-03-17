import { ITeamTask } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Popover, Transition } from '@headlessui/react';
import { PropsWithChildren } from 'react';
import { TaskInput } from './task-input';

export function TaskUnOrAssignPopover({
	children,
	tasks,
	onTaskClick,
	buttonClassName,
	onTaskCreated,
	usersTaskCreatedAssignTo,
}: PropsWithChildren<{
	tasks?: ITeamTask[];
	onTaskClick?: (task: ITeamTask, close: () => void) => void;
	buttonClassName?: string;
	onTaskCreated?: (task: ITeamTask | undefined, close: () => void) => void;
	usersTaskCreatedAssignTo?: {
		id: string;
	}[];
}>) {
	return (
		<Popover className="relative">
			<Popover.Button
				as="div"
				className={clsxm(
					'flex items-center mb-2 outline-none border-none cursor-pointer',
					buttonClassName
				)}
			>
				{children}
			</Popover.Button>

			<Transition
				enter="transition duration-100 ease-out"
				enterFrom="transform scale-95 opacity-0"
				enterTo="transform scale-100 opacity-100"
				leave="transition duration-75 ease-out"
				leaveFrom="transform scale-100 opacity-100"
				leaveTo="transform scale-95 opacity-0"
				className="absolute z-10 right-[110%] top-0"
			>
				<Popover.Panel>
					{({ close }) => {
						return (
							<TaskInput
								task={null}
								tasks={tasks}
								initEditMode={true}
								keepOpen={true}
								autoAssignTaskAuth={false}
								createOnEnterClick={true}
								viewType="one-view"
								onTaskClick={(task) => onTaskClick && onTaskClick(task, close)}
								onTaskCreated={(task) =>
									onTaskCreated && onTaskCreated(task, close)
								}
								usersTaskCreatedAssignTo={usersTaskCreatedAssignTo}
							/>
						);
					}}
				</Popover.Panel>
			</Transition>
		</Popover>
	);
}
