export function generateToken(length: number) {
	const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	let token = '';
	for (let i = 0; i < length; i++) {
		token += chars[Math.floor(Math.random() * chars.length)];
	}
	return token;
}
