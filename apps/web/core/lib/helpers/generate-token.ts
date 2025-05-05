import { randomBytes } from 'crypto';

export function generateToken(length: number) {
	const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	let token = '';
	const randomValues = randomBytes(length);
	for (let i = 0; i < length; i++) {
		token += chars[randomValues[i] % chars.length];
	}
	return token;
}
