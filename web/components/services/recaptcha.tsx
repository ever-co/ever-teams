import ReCAPTCHA from "react-google-recaptcha";

const ReactReCAPTCHA = ReCAPTCHA as any;

export function SiteReCAPTCHA({
  key = process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY,
  onChange,
  onErrored,
  onExpired,
}: {
  key?: string;
  onChange: (token: string | null) => void;
  onExpired?: () => void;
  onErrored?: () => void;
}) {
  return (
    <ReactReCAPTCHA
      sitekey={key}
      onChange={onChange}
      onExpired={onExpired}
      onErrored={onErrored}
    />
  );
}
