'use client';
import React from 'react';
import { GoogleReCaptchaProvider, GoogleReCaptchaV3ProviderProps } from '@google-recaptcha/react';

/**
 * Client-side boundary for Google reCAPTCHA v3 integration.
 * Ensures children are wrapped with the reCAPTCHA provider using the site key from environment variables.
 *
 * @param {GoogleReCaptchaV3ProviderProps} props - Provider props, must include children.
 * @returns {JSX.Element | null}
 */
const ReCaptchaClientBoundary: React.FC<GoogleReCaptchaV3ProviderProps> = ({ children, ...providerProps }) => {
	const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_KEY;

	// Remove possible siteKey/type from providerProps to avoid duplicate props
	// (TypeScript will warn if these are present twice)
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { siteKey: _siteKey, type: _type, ...restProviderProps } = providerProps;

	if (!siteKey) {
		if (process.env.NODE_ENV !== 'production') {
			// eslint-disable-next-line no-console
			console.warn(
				'[ReCaptchaClientBoundary] NEXT_PUBLIC_RECAPTCHA_KEY is not set. Google reCAPTCHA will not be initialized.'
			);
		}
		return null;
	}

	return (
		<GoogleReCaptchaProvider siteKey={siteKey} type="v3" {...restProviderProps}>
			{children}
		</GoogleReCaptchaProvider>
	);
};

export default ReCaptchaClientBoundary;
