import ReCAPTCHA from "react-google-recaptcha";

export function SiteReCAPTCHA({
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
    <ReCAPTCHA
      sitekey={
        process.env.CAPTCHA_SITE_KEY
          ? process.env.CAPTCHA_SITE_KEY
          : "6LfB02MeAAAAAFKnuwL0zU2lyZt_fIXUKZ5gY4ME"
      }
      onChange={onChange}
      onExpired={onExpired}
      onErrored={onErrored}
    />
  );
}
