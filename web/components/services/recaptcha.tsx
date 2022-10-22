import ReCAPTCHA from "react-google-recaptcha";

export function SiteReCAPTCHA({
  key = process.env.CAPTCHA_SITE_KEY,
  onChange,
  onErrored,
  onExpired,
}: {
  key?: string;
  onChange?: (res: string) => void;
  onExpired?: () => void;
  onErrored?: () => void;
}) {
  return (
    <ReCAPTCHA
      sitekey={key}
      onChange={onChange}
      onExpired={onExpired}
      onErrored={onErrored}
    />
  );
}
