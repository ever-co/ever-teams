import { SiteReCAPTCHA } from "../../services/recaptcha";

type IFrameProps = {
  onChange?: (res: string) => void;
  onErrored?: () => void;
  onExpired?: () => void;
};

export const Iframe = ({ onChange, onErrored, onExpired }: IFrameProps) => {
  return (
    <SiteReCAPTCHA
      onChange={onChange}
      onErrored={onErrored}
      onExpired={onExpired}
    />
  );
};
