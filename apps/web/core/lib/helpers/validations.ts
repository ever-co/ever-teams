import { RECAPTCHA_SITE_KEY, smtpConfiguration } from '@/core/constants/config/constants';
import { IRegisterDataAPI } from '@/core/types/interfaces/to-review/IAuthentication';
import { I_SMTPRequest } from '@/core/types/interfaces/smpt/ICustomSmtp';
import { PHONE_REGEX, URL_REGEX } from './regex';
import { isEmail } from 'class-validator';

type Err = { [x in keyof IRegisterDataAPI]: string | undefined };

type Ks = { [x: string]: string };

export const authFormValidate = (keys: (keyof IRegisterDataAPI)[], values: IRegisterDataAPI) => {
	const err = {} as Err;

	keys.forEach((key) => {
		switch (key) {
			case 'email':
				if (!isEmail(values['email'])) {
					err['email'] = 'Please provide a properly formatted email address';
				}
				break;
			case 'name':
				if (values['name'].trim().length < 2) {
					err['name'] = 'You must provide a valid Name';
				}
				break;
			case 'recaptcha':
				if (RECAPTCHA_SITE_KEY?.value) {
					if (!values['recaptcha'] || values['recaptcha'].trim().length < 2) {
						err['recaptcha'] = 'Please check the ReCaptcha checkbox before continue';
					}
				}
				break;
			case 'team':
				if (values['team'].trim().length < 2) {
					err['team'] = 'You must provide a valid Team Name';
				}
				break;
			case 'code':
				if (values['code'].trim().length < 6) {
					err['code'] = 'Your invitation code must contain 6 digits';
				}
				break;
		}
	});
	return {
		valid: Object.keys(err).length === 0,
		errors: err
	};
};

export const hasErrors = (errors: { [x: string]: string }) => {
	return { errors };
};

export function validateForm<T extends Ks>(keys: (keyof T)[], data: T) {
	const errors = {} as { [k in keyof T]: string | undefined };

	keys.forEach((key) => {
		const value = data[key];
		data[key] = typeof value === 'string' ? (value.trim() as any) : value;
		switch (key) {
			case 'email':
				if (value && !isEmail(value)) {
					errors[key] = 'Please provide a valid email address';
				}
				break;
			case 'phone':
				if (value && !PHONE_REGEX.test(value)) {
					errors[key] = 'Please provide a valid phone number';
				}
				break;
			case 'url':
				if (value && !URL_REGEX.test(value)) {
					errors[key] = 'Please provide a valid URL';
				}
				break;
		}

		if (!value || value.trim().length < 2) {
			errors[key] = 'Please make sure to fill out this field';
		}
	});

	return {
		errors,
		isValid: Object.keys(errors).length === 0
	};
}

export function validSMTPConfig() {
	const SMTPConfig = smtpConfiguration();

	console.log(`SMTP Config: ${JSON.stringify(SMTPConfig)}`);

	const keys = Object.keys(SMTPConfig) as (keyof I_SMTPRequest)[];

	if (keys.some((key) => SMTPConfig[key] === null || SMTPConfig[key] === undefined)) {
		return null;
	}

	return SMTPConfig;
}
