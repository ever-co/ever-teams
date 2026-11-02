'use client';

import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { taskTimeFiguresOf } from '@/core/lib/utils/task-detail';
import { activeTeamState } from '@/core/stores';
import type { TTask } from '@/core/types/schemas/task/task.schema';

export function useTaskTimeFigures(task: TTask) {
	const activeTeam = useAtomValue(activeTeamState);
	const { data: user } = useUserQuery();
	const members = activeTeam?.members;
	const userId = user?.id;
	return useMemo(() => taskTimeFiguresOf(task, members ?? [], userId), [task, members, userId]);
}
