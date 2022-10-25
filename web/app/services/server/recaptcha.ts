import { serverFetch } from "./fetch";

export function recaptchaVerification(
  secret_key: string,
  response_key: string
) {
  return serverFetch<{ success: boolean }>(
    `https://www.google.com/recaptcha/api/siteverify?secret=${secret_key}&response=${response_key}`,
    "GET",
    {},
    undefined,
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );
}
