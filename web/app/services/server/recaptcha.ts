export function recaptchaVerification(
  secret_key: string,
  response_key: string
): Promise<{ success: boolean }> {
  return fetch(
    `https://www.google.com/recaptcha/api/siteverify?secret=${secret_key}&response=${response_key}`,
    { method: "POST" }
  ).then((res) => res.json());
}
