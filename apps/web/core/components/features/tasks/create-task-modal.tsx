'use client';

import { DialogTitle } from '@headlessui/react';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { TaskInputKanban } from '@/core/components/tasks/task-input-kanban';
import {
	DialogBreadcrumb,
	DialogBreadcrumbSeparator,
	DialogHeaderRow,
	dialogTitleText
} from '@/core/components/common/dialog';
import { activeTeamState } from '@/core/stores';

const CreateTaskModal = (props: { onClose: any; task: any; initEditMode: boolean; tasks: any; title: string }) => {
	const t = useTranslations();
	const activeTeam = useAtomValue(activeTeamState);
	const teamName = activeTeam?.name;

	return (
		<div className="flex w-[40rem] max-w-full flex-col gap-4">
			<DialogHeaderRow className="pr-9">
				{teamName && <DialogBreadcrumb>{teamName}</DialogBreadcrumb>}
				{teamName && <DialogBreadcrumbSeparator />}
				<DialogTitle className={dialogTitleText}>{t('common.CREATE_TASK')}</DialogTitle>
			</DialogHeaderRow>
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
