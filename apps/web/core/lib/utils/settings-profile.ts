import isEmail from 'validator/lib/isEmail';
import type { TUser } from '@/core/types/schemas';

export const PROFILE_NAME_MAX_LENGTH = 80;

export const AVATAR_ACCEPTED_TYPES: readonly string[] = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

export const AVATAR_ACCEPT_ATTRIBUTE = AVATAR_ACCEPTED_TYPES.join(',');

export const AVATAR_MAX_MEGABYTES = 5;

const BYTES_PER_MEGABYTE = 1024 * 1024;

export const AVATAR_MAX_BYTES = AVATAR_MAX_MEGABYTES * BYTES_PER_MEGABYTE;

export const PROFILE_AVATAR_FOLDER = 'profile_pictures_avatars';

export type AvatarFileProblem = 'type' | 'size';

export function avatarFileProblemOf(file: Pick<File, 'type' | 'size'>): AvatarFileProblem | null {
	const isAcceptedType = AVATAR_ACCEPTED_TYPES.includes(file.type);
	if (!isAcceptedType) {
		return 'type';
	}
	const isTooLarge = file.size > AVATAR_MAX_BYTES;
	if (isTooLarge) {
		return 'size';
	}
	return null;
}

export type NameProblem = 'required' | 'tooLong';

export function nameProblemOf(value: string, isRequired: boolean): NameProblem | null {
	const trimmed = value.trim();
	const isMissing = trimmed.length === 0;
	if (isMissing && isRequired) {
		return 'required';
	}
	const isTooLong = trimmed.length > PROFILE_NAME_MAX_LENGTH;
	if (isTooLong) {
		return 'tooLong';
	}
	return null;
}

export type EmailChangeProblem = 'invalid' | 'same';

function comparableEmail(email: string | null | undefined): string {
	const trimmed = (email ?? '').trim();
	return trimmed.toLowerCase();
}

export function emailChangeProblemOf(
	candidate: string,
	currentEmail: string | null | undefined
): EmailChangeProblem | null {
	const trimmed = candidate.trim();
	const isValid = isEmail(trimmed);
	if (!isValid) {
		return 'invalid';
	}
	const isSameAddress = comparableEmail(trimmed) === comparableEmail(currentEmail);
	if (isSameAddress) {
		return 'same';
	}
	return null;
}

export function avatarUrlOf(user: TUser | null | undefined): string | undefined {
	const image = user?.image;
	const candidates = [image?.thumbUrl, image?.fullUrl, user?.imageUrl];
	const url = candidates.find((candidate) => Boolean(candidate));
	return url ?? undefined;
}

export function hasOwnAvatar(user: TUser | null | undefined): boolean {
	return Boolean(user?.imageId);
}
