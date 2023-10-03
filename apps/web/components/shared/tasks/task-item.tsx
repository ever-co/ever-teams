import { ITeamTask } from '@app/interfaces/ITask';
import Image from 'next/image';
import { BadgedTaskStatus } from '../../ui/status-icons';
import { ArrowPathIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/20/solid';
import { Spinner } from '../../ui/loaders/spinner';

export function TaskItem({
	selected,
	item,
	onDelete,
	onReopen,
	updateLoading
}: {
	selected: boolean;
	item: ITeamTask;
	active?: boolean;
	onDelete: () => void;
	onReopen: () => Promise<any>;
	updateLoading: boolean;
}) {
	return (
		<>
			<span
				className={`truncate h-[30px] flex items-center ${
					selected ? 'font-medium' : 'font-normal'
				}`}
			>
				<div className="flex items-center justify-between w-full">
					<div>
						<span className="text-[#9490A0]">#{item.taskNumber}</span>{' '}
						{item.title}
					</div>
					<div className="flex items-center space-x-4">
						<BadgedTaskStatus status={item.status} />
						<div className="flex items-center justify-center space-x-1">
							{item.selectedTeam?.members &&
								item.selectedTeam?.members.map((member, i) => (
									<div className="flex justify-center items-center" key={i}>
										<Image
											src={member.employee.user?.imageUrl || ''}
											alt={
												(member.employee.user?.firstName || '') +
												' ' +
												(member.employee.user?.lastName || '')
											}
											width={30}
											height={30}
										/>
									</div>
								))}{' '}
						</div>

						<div onClick={(e) => e.stopPropagation()}>
							{item.status === 'closed' ? (
								updateLoading ? (
									<Spinner dark={false} />
								) : (
									<ArrowPathIcon
										className="w-5 h-5 text-gray-400 hover:text-primary dark:hover:text-white"
										onClick={onReopen}
									/>
								)
							) : (
								<XMarkIcon
									className="w-5 h-5 text-gray-400 hover:text-primary dark:hover:text-white"
									onClick={onDelete}
								/>
							)}
						</div>
					</div>
				</div>
			</span>
			{selected ? (
				<span
					className={`absolute inset-y-0 left-0 flex items-center dark:text-white text-primary pl-3`}
				>
					<CheckIcon className="h-5 w-5" aria-hidden="true" />
				</span>
			) : null}
		</>
	);
}
