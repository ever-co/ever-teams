export function recaptchaVerification({
	secret,
	response
}: {
	secret: string;
	response: string;
}): Promise<{ success: boolean }> {
	return fetch(
		`https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${response}`,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			}
		}
	).then((res) => res.json());
}
