import { Spinner } from '@/core/components/common/spinner';
import { ChangeEventHandler, Dispatch, forwardRef, SetStateAction } from 'react';
import { MemberCardEditableValues } from '@/core/types/interfaces/organization/employee';
import { TTask } from '@/core/types/schemas/task/task.schema';

type Props = {
	memberTask: TTask | null;
	editMode: boolean;
	hasEditMode: boolean;
	editable: MemberCardEditableValues;
	onSubmitName: () => void;
	onChangeName: ChangeEventHandler<HTMLInputElement>;
	setEditMode: Dispatch<SetStateAction<boolean>>;
	loading: boolean;
};

export const TaskInfo = forwardRef<HTMLInputElement, Props>(
	({ memberTask, editMode, hasEditMode, editable, onSubmitName, onChangeName, setEditMode, loading }, ref) => {
		return (
			<div className={`w-[334px]  h-[48px] font-light text-normal hover:rounded-md hover:cursor-text`}>
				{editMode === true ? (
					<div className="flex items-center">
						<input
							name="memberTask"
							ref={ref}
							value={editable.memberTask}
							onChange={onChangeName}
							onKeyPress={(event) => event.key === 'Enter' && onSubmitName && onSubmitName()}
							className="w-full resize-none h-[48px] rounded-lg px-2 py-2 shadow-sm shadow-black/10 hairline-border border-border"
						/>
						<span className="w-3 h-5 ml-2">{loading && <Spinner dark={false} />}</span>
					</div>
				) : (
					<div
						className={`w-[334px] text-center h-[48px]  font-light text-normal px-[14px] hairline-border border-white dark:border-border hover:border-border  hover:rounded-md hover:cursor-text`}
						onDoubleClick={hasEditMode ? () => setEditMode(true) : undefined}
					>
						{memberTask ? (
							<span className="text-muted-foreground">{`#${memberTask.taskNumber} `}</span>
						) : (
							''
						)}
						{editable.memberTask}
					</div>
				)}
			</div>
		);
	}
);

TaskInfo.displayName = 'TaskInfo';
