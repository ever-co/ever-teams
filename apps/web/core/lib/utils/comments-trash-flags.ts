import { readRuntimeEnv } from '@/env-config';

function isOn(
	name: 'NEXT_PUBLIC_COMMENT_REACTIONS_ENABLED' | 'NEXT_PUBLIC_TASK_TRASH_ENABLED',
	buildTime: string | undefined
) {
	const value = readRuntimeEnv(name) || buildTime;
	return String(value ?? '').trim() === 'true';
}

/**
 * Whether task comments show emoji reactions (`NEXT_PUBLIC_COMMENT_REACTIONS_ENABLED=true`, read at runtime). Off by
 * default: no chip, no picker, no request. The platform summary is `GET /reaction/comments` (ever-gauzy #11802).
 */
export function isCommentReactionsEnabled(): boolean {
	return isOn('NEXT_PUBLIC_COMMENT_REACTIONS_ENABLED', process.env.NEXT_PUBLIC_COMMENT_REACTIONS_ENABLED);
}

/**
 * Whether deleted tasks go to a trash the team and project pages list (`NEXT_PUBLIC_TASK_TRASH_ENABLED=true`, read at
 * runtime). Off by default: a delete is permanent, as before. The platform lists the trash only with
 * `GAUZY_TASK_TRASH_ENABLED` (it answers 404 otherwise, and the trash page says so).
 */
export function isTaskTrashEnabled(): boolean {
	return isOn('NEXT_PUBLIC_TASK_TRASH_ENABLED', process.env.NEXT_PUBLIC_TASK_TRASH_ENABLED);
}
