import { IClassName } from '../common/class-name';
import { IDailyPlan } from './daily-plan/daily-plan';
import { I_UserProfilePage } from '@/core/hooks';
import { Nullable, SetAtom } from '../../generics';
import { SetStateAction } from 'jotai';
import { TOrganizationTeam } from '../../schemas/team/organization-team.schema';
import { TTask } from '../../schemas/task/task.schema';

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
