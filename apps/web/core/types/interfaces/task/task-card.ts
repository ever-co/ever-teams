import { IDailyPlan } from './daily-plan/daily-plan';
import { I_UserProfilePage } from '@/core/hooks';
import { SetAtom } from '../../generics';
import { SetStateAction } from 'jotai';
import { TOrganizationTeam } from '../../schemas/team/organization-team.schema';
import { TTask } from '../../schemas/task/task.schema';

/* eslint-disable no-mixed-spaces-and-tabs */
import { IClassName } from '@/core/types/interfaces/common/class-name';
import { ITaskStatusField } from '@/core/types/interfaces/task/task-status/task-status-field';
import { ITaskStatusStack } from '@/core/types/interfaces/task/task-status/task-status-stack';
import { Nullable } from '@/core/types/generics/utils';
// import { LoginIcon, RecordIcon } from 'lib/components/svgs';
import React, { PropsWithChildren, RefObject } from 'react';

export type FilterTabs = 'Today Tasks' | 'Future Tasks' | 'Past Tasks' | 'All Tasks' | 'Outstanding';

export type TaskCardGlobal = {
	active?: boolean;
	task?: Nullable<TTask>;
	isAuthUser: boolean;
	activeAuthTask: boolean;
	viewType?: 'default' | 'unassign' | 'dailyplan';
	profile?: I_UserProfilePage;
	editTaskId?: string | null;
	setEditTaskId?: SetAtom<[SetStateAction<string | null>], void>;
	taskBadgeClassName?: string;
	taskTitleClassName?: string;
	plan?: IDailyPlan;
	planMode?: FilterTabs;
} & IClassName;

export interface TaskCardProps extends IClassName {
	active?: boolean;
	task?: TTask | null;
	isAuthUser: boolean;
	activeAuthTask: boolean;
	viewType?: 'default' | 'unassign' | 'dailyplan';
	profile?: I_UserProfilePage;
	plan?: IDailyPlan;
	planMode?: FilterTabs;
	taskBadgeClassName?: string;
	taskTitleClassName?: string;
	activeTeam?: TOrganizationTeam;
}

export type TStatusItem = {
	id?: string;
	bgColor?: string | null;
	icon?: React.ReactNode | undefined;
	realName?: string;
	name?: string;
	value?: string;
	bordered?: boolean;
	showIcon?: boolean;
	className?: string;
};

export type TStatus<T extends string = string> = {
	[k in T]: TStatusItem;
};

export type TTaskStatusesDropdown<T extends ITaskStatusField> = IClassName &
	PropsWithChildren<{
		defaultValue?: ITaskStatusStack[T];
		onValueChange?: (v: ITaskStatusStack[T], values?: ITaskStatusStack[T][]) => void;
		forDetails?: boolean;
		dynamicValues?: any[];
		multiple?: boolean;
		disabled?: boolean;
		largerWidth?: boolean;
		sidebarUI?: boolean;
		placeholder?: string;
		defaultValues?: ITaskStatusStack[T][];
		taskStatusClassName?: string;
		latestLabels?: RefObject<string[]>;
		dropdownContentClassName?: string;
		isMultiple?: boolean;
	}>;

export type TTaskVersionsDropdown<T extends ITaskStatusField> = IClassName & {
	defaultValue?: ITaskStatusStack[T];
	onValueChange?: (v: ITaskStatusStack[T]) => void;
};

export type IActiveTaskStatuses<T extends ITaskStatusField> = TTaskStatusesDropdown<T> & {
	onChangeLoading?: (loading: boolean) => void;
} & {
	task?: Nullable<TTask>;
	showIssueLabels?: boolean;
	forDetails?: boolean;
	sidebarUI?: boolean;

	forParentChildRelationship?: boolean;
	taskStatusClassName?: string;
	showIcon?: boolean;
};
