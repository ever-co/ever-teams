import { ITeamTask } from '@app/interfaces/ITask';
import { Spinner } from '@components/ui/loaders/spinner';
import { ChangeEventHandler, Dispatch, forwardRef, SetStateAction } from 'react';
import { MC_EditableValues } from '../types';

type Props = {
	memberTask: ITeamTask | null;
	editMode: boolean;
	hasEditMode: boolean;
	editable: MC_EditableValues;
	onSubmitName: () => void;
	onChangeName: ChangeEventHandler<HTMLInputElement>;
	setEditMode: Dispatch<SetStateAction<boolean>>;
	loading: boolean;
};

export const TaskInfo = forwardRef<HTMLInputElement, Props>(
	({ memberTask, editMode, hasEditMode, editable, onSubmitName, onChangeName, setEditMode, loading }, ref) => {
		return (
			<div className={`w-[334px]  h-[48px] font-light text-normal hover:rounded-[8px] hover:cursor-text`}>
				{editMode === true ? (
					<div className="flex items-center">
						<input
							name="memberTask"
							ref={ref}
							value={editable.memberTask}
							onChange={onChangeName}
							onKeyPress={(event) => event.key === 'Enter' && onSubmitName && onSubmitName()}
							className="w-full resize-none h-[48px] rounded-lg px-2 py-2 shadow-inner border border-[#D7E1EB] dark:border-[#27272A]"
						/>
						<span className="w-3 h-5 ml-2">{loading && <Spinner dark={false} />}</span>
					</div>
				) : (
					<div
						className={`w-[334px] text-center h-[48px]  font-light text-normal px-[14px] border border-white dark:border-[#202023] hover:border-[#D7E1EB] dark:hover:border-[#27272A]  hover:rounded-[8px] hover:cursor-text`}
						onDoubleClick={hasEditMode ? () => setEditMode(true) : undefined}
					>
						{memberTask ? <span className="text-[#9490A0]">{`#${memberTask.taskNumber} `}</span> : ''}
						{editable.memberTask}
					</div>
				)}
			</div>
		);
	}
);

TaskInfo.displayName = 'TaskInfo';
