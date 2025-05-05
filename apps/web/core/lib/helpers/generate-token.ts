import { randomBytes } from 'crypto';

export function generateToken(length: number) {
	const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	let token = '';
	const randomValues = randomBytes(length);
	for (let i = 0; i < length; ) {
		const value = randomValues[i];
		if (value < 256 - (256 % chars.length)) {
			token += chars[value % chars.length];
			i++;
		}
	}
	return token;
}
