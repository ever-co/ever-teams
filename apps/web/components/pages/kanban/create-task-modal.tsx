import { TaskInputKanban } from 'lib/features/task/task-input-kanban';
import React from 'react';

const CreateTaskModal = (props: { task: any; initEditMode: boolean; tasks: any; title: string }) => {
	return (
		<div className="w-[700px] pt-12 pr-2 h-96 bg-transparent ">
			<TaskInputKanban
				kanbanTitle={props.title}
				task={props.task}
				initEditMode={false}
				keepOpen={true}
				showCombobox={false}
				autoFocus={true}
				autoInputSelectText={false}
				onTaskClick={(e) => {
					console.log(e);
				}}
			/>
		</div>
	);
};

export default CreateTaskModal;
