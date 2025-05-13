import { TaskInputKanban } from '@/core/components/tasks/task-input-kanban';

const CreateTaskModal = (props: { onClose: any; task: any; initEditMode: boolean; tasks: any; title: string }) => {
	return (
		<div className="w-[700px] pt-12 pr-2 h-96 bg-transparent ">
			<TaskInputKanban
				onClose={props.onClose}
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
