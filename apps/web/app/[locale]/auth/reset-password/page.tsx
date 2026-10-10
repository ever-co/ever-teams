import ResetPasswordForm from '@/core/components/pages/auth/reset-password/reset-password-form';
import { decodeJWT } from '@/core/lib/auth/jwt-utils';

export default async function Page({
	searchParams
}: Readonly<{ searchParams: Promise<{ token?: string | string[] }> }>) {
	const { token } = await searchParams;
	// Read with the server clock so a visitor's wrong clock cannot lock them out of a valid link.
	// An undecodable token still gets the form: Gauzy remains the authority on submit.
	// A repeated parameter arrives as an array: check its first entry, the one searchParams.get() gives the form.
	const firstToken = Array.isArray(token) ? token[0] : token;
	const payload = typeof firstToken === 'string' ? decodeJWT(firstToken) : null;
	const isTokenExpired = !!payload && payload.exp * 1000 <= Date.now();

	return <ResetPasswordForm isTokenExpired={isTokenExpired} />;
}
