import ReCAPTCHA from "react-google-recaptcha";

export function SiteReCAPTCHA({
  key = "6LfB02MeAAAAAFKnuwL0zU2lyZt_fIXUKZ5gY4ME",
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
