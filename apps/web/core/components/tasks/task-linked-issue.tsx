'use client';

import { useQueryCall } from '@/core/hooks';
import { clsxm } from '@/core/lib/utils';
import { Dropdown, DropdownItem } from '@/core/components';
import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { TaskNameInfoDisplay } from './task-displays';
import { ActiveTaskStatusDropdown } from './task-status';
import { useTranslations } from 'next-intl';
import { taskLinkedIssueService } from '@/core/services/client/api/tasks/task-linked-issue.service';
import { EverCard } from '../common/ever-card';
import { ITaskLinkedIssue } from '@/core/types/interfaces/task/task-linked-issue';
import { ERelatedIssuesRelation } from '@/core/types/generics/enums/task';
import { TTask } from '@/core/types/schemas/task/task.schema';

export function TaskLinkedIssue({
	task,
	className,
	relatedTaskDropdown,
	issue
}: {
	task: TTask;
	className?: string;
	relatedTaskDropdown?: boolean;
	issue?: ITaskLinkedIssue;
}) {
	const { actionType, actionTypeItems, onChange } = useActionType(
		issue?.action || ERelatedIssuesRelation.RELATES_TO,
		issue
	);

	return (
		<EverCard shadow="custom" className={clsxm('flex justify-between items-center px-0 py-3 md:px-0', className)}>
			<Link href={`/task/${task.id}`}>
				<TaskNameInfoDisplay
					task={task}
					dash
					className={clsxm(
						task.issueType === 'Bug' ? '!px-[0.3312rem] py-[0.2875rem]' : '!px-[0.375rem] py-[0.375rem]',
						'rounded-full'
					)}
					// className="px-1 md:px-1 flex mr-2.5"
					taskTitleClassName="font-semibold text-xs 3xl:text-sm flex items-center"
					taskNumberClassName="font-semibold text-xs text-[#BAB8C4]"
				/>
			</Link>

			<div className="flex items-center space-x-3">
				{relatedTaskDropdown && issue && (
					<Dropdown
						buttonClassName={
							'px-2 py-0 rounded-[0.1875rem] bg-transparent border dark:border-[#FFFFFF33] dark:bg-[#1B1D22]'
						}
						optionsClassName={'mt-0 3xl:text-xs'}
						value={actionType}
						onChange={onChange}
						items={actionTypeItems}
					/>
				)}

				<div className="min-w-[10rem] flex justify-end">
					<div className="inline-block">
						<ActiveTaskStatusDropdown
							task={task}
							defaultValue={task.status}
							taskStatusClassName="min-w-[6rem] 3xl:min-w-[7rem] h-5 3xl:h-6 text-[10px] 3xl:text-xs font-semibold rounded-[0.1875rem]"
							showIcon={false}
						/>
					</div>
				</div>
			</div>
		</EverCard>
	);
}

type ActionType = { name: string; value: ERelatedIssuesRelation };
type ActionTypeItem = DropdownItem<ActionType>;

function mapToActionType(items: ActionType[] = []) {
	return items.map<ActionTypeItem>((item) => {
		return {
			key: item.value,
			Label: () => {
				return (
					<button
						className={clsxm(
							'whitespace-nowrap mb-2 w-full',
							'flex justify-start flex-col border-b border-[#00000014] dark:border-[#26272C] 3xl:text-sm'
						)}
					>
						<span className="pb-1">{item.name}</span>
					</button>
				);
			},
			selectedLabel: <span className="flex text-[10px] 3xl:text-xs">{item.name}</span>,
			data: item
		};
	});
}

function useActionType(defaultValue: ERelatedIssuesRelation, issue: ITaskLinkedIssue | undefined) {
	const t = useTranslations();

	const { queryCall } = useQueryCall(taskLinkedIssueService.updateTaskLinkedIssue);

	const actionsTypes = useMemo(
		() => [
			{
				name: t('common.BLOCKS'),
				value: ERelatedIssuesRelation.BLOCKS
			},
			{
				name: t('common.CLONES'),
				value: ERelatedIssuesRelation.CLONES
			},
			{
				name: t('common.DUPLICATES'),
				value: ERelatedIssuesRelation.DUPLICATES
			},
			{
				name: t('common.IS_BLOCKED_BY'),
				value: ERelatedIssuesRelation.IS_BLOCKED_BY
			},
			{
				name: t('common.IS_CLONED_BY'),
				value: ERelatedIssuesRelation.IS_CLONED_BY
			},
			{
				name: t('common.IS_DUPLICATED_BY'),
				value: ERelatedIssuesRelation.IS_DUPLICATED_BY
			},
			{
				name: t('common.RELATES_TO'),
				value: ERelatedIssuesRelation.RELATES_TO
			}
		],
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[]
	);

	const actionTypeItems = useMemo(() => mapToActionType(actionsTypes), [actionsTypes]);

	const relatedToItem = useMemo(
		() => actionTypeItems.find((t) => t.key === defaultValue),
		[actionTypeItems, defaultValue]
	);

	const [actionType, setActionType] = useState<ActionTypeItem | null>(relatedToItem || null);

	const onChange = useCallback(
		(item: ActionTypeItem) => {
			if (!issue || !item.data?.value) {
				return;
			}
			setActionType(item);

			queryCall({
				...issue,
				action: item.data?.value
			});
		},
		[setActionType, issue, queryCall]
	);

	return {
		actionTypeItems,
		actionType,
		onChange
	};
}
