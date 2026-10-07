'use client';
import React from 'react';
import { GoogleReCaptchaProvider, GoogleReCaptchaV3ProviderProps } from '@google-recaptcha/react';
import { readRuntimeEnv } from '@/env-config';

/**
 * Client-side boundary for Google reCAPTCHA v3 integration.
 * Ensures children are wrapped with the reCAPTCHA provider using the site key from environment variables.
 *
 * @param {GoogleReCaptchaV3ProviderProps} props - Provider props, must include children.
 * @returns {JSX.Element | null}
 */
const ReCaptchaClientBoundary: React.FC<GoogleReCaptchaV3ProviderProps> = ({ children, ...providerProps }) => {
	// Runtime (container) env first, so a published Docker image can supply its own key; the literal is the
	// build-time fallback. Deliberately NOT falling back to NEXT_PUBLIC_CAPTCHA_SITE_KEY: that key may be a
	// v2/hCaptcha key (NEXT_PUBLIC_CAPTCHA_TYPE), while this boundary always initialises reCAPTCHA v3.
	const siteKey = readRuntimeEnv('NEXT_PUBLIC_RECAPTCHA_KEY') || process.env.NEXT_PUBLIC_RECAPTCHA_KEY;

	// Remove possible siteKey/type from providerProps to avoid duplicate props
	// (TypeScript will warn if these are present twice)
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
