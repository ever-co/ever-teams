import type { TUser } from '@/core/types/schemas';

function updatedTimeOf(user: TUser): number | null {
	if (!user.updatedAt) {
		return null;
	}
	const time = new Date(user.updatedAt).getTime();
	if (Number.isNaN(time)) {
		return null;
	}
	return time;
}

/**
 * Whether the user the server answered replaces the stored one: another user, or a newer version of the same user.
 * An older copy never does, since a local save can store a user before the user query reads it back.
 */
export function shouldReplaceStoredUser(stored: TUser | null, queried: TUser): boolean {
	if (!stored) {
		return true;
	}
	const isAnotherUser = queried.id !== stored.id;
	if (isAnotherUser) {
		return true;
	}
	const queriedTime = updatedTimeOf(queried);
	if (queriedTime === null) {
		return false;
	}
	const storedTime = updatedTimeOf(stored);
	if (storedTime === null) {
		return true;
	}
	return queriedTime > storedTime;
}
