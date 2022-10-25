import { RECAPTCHA_SITE_KEY } from "@app/constants";
import ReCAPTCHA from "react-google-recaptcha";

const ReactReCAPTCHA = ReCAPTCHA as any;

export function SiteReCAPTCHA({
  key = RECAPTCHA_SITE_KEY,
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
    <ReactReCAPTCHA
      sitekey={key}
      onChange={onChange}
      onExpired={onExpired}
      onErrored={onErrored}
    />
  );
}
