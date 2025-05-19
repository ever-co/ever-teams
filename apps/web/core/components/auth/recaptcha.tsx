import ReCAPTCHA from 'react-google-recaptcha';

const ReactReCAPTCHA = ReCAPTCHA as any;

export function SiteReCAPTCHA({
	siteKey,
	onChange,
	onErrored,
	onExpired
}: {
	siteKey: string;
	onChange: (token: string | null) => void;
	onExpired?: () => void;
	onErrored?: () => void;
}) {
	return <ReactReCAPTCHA sitekey={siteKey} onChange={onChange} onExpired={onExpired} onErrored={onErrored} />;
}
