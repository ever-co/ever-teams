import { generateToken } from '@/core/lib/helpers/generate-token';
import { authFormValidate } from '@/core/lib/helpers/validations';
import { IRegisterDataAPI } from '@/core/types/interfaces/to-review/auth/IAuth';
import {
	createEmployeeFromUser,
	createOrganizationRequest,
	createOrganizationTeamRequest,
	createTenantRequest,
	createTenantSmtpRequest,
	loginUserRequest,
	refreshTokenRequest,
	registerUserRequest
} from '@/core/services/server/requests';
import { setAuthCookies } from '@/core/lib/helpers/cookies';
import { recaptchaVerification } from '@/core/services/server/recaptcha';
import {
	RECAPTCHA_SECRET_KEY,
	SMTP_PASSWORD,
	SMTP_USERNAME,
	VERIFY_EMAIL_CALLBACK_PATH
} from '@/core/constants/config/constants';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
	const url = new URL(req.url);
	const response = new NextResponse();

	const appEmailConfirmationUrl = `${url.origin}${VERIFY_EMAIL_CALLBACK_PATH}`;

	const body = (await req.json()) as unknown as IRegisterDataAPI;

	const noRecaptchaArray = ['email', 'name', 'team'];

	const withRecaptchaArray = [...noRecaptchaArray, 'recaptcha'];

	const validationFields = RECAPTCHA_SECRET_KEY ? withRecaptchaArray : noRecaptchaArray;

	const { errors, valid: formValid } = authFormValidate(validationFields, body);

	if (!formValid) {
		return NextResponse.json({ errors });
	}

	if (RECAPTCHA_SECRET_KEY) {
		const { success } = await recaptchaVerification({
			secret: RECAPTCHA_SECRET_KEY,
			response: body.recaptcha ? body.recaptcha : ''
		});

		if (!success) {
			return NextResponse.json({ errors: { recaptcha: 'Invalid reCAPTCHA. Please try again' } });
		}
	}
	/**
	 * Verify if the SMTP has been configured
	 */
	// const hasSMTPConfig = validSMTPConfig();

	// if (0 && hasSMTPConfig) {
	// 	return NextResponse.json({
	// 		status: 400,
	// 		message: 'Unable to find SMTP configuration',
	// 	});
	// }

	// General a random password with 8 chars
	const password = generateToken(8);
	const names = body.name.split(' ');

	console.log('Random password: ', password);

	// Register user
	const { data: user } = await registerUserRequest({
		password: password,
		confirmPassword: password,
		user: {
			firstName: names[0],
			lastName: names[1] || '',
			email: body.email,
			timeZone: body.timezone as string
		},
		appEmailConfirmationUrl
	});
	// User Login, get the access token
	const { data: loginRes } = await loginUserRequest(body.email, password);
	let auth_token = loginRes.token;

	// Create user tenant
	const { data: tenant } = await createTenantRequest(body.team, auth_token);

	// Create tenant SMTP
	if (SMTP_USERNAME && SMTP_PASSWORD) {
		await createTenantSmtpRequest({
			access_token: auth_token,
			tenantId: tenant.id
		});
	}

	// Create user organization
	const { data: organization } = await createOrganizationRequest(
		{
			currency: 'USD',
			name: body.team,
			tenantId: tenant.id,
			invitesAllowed: true
		},
		auth_token
	);

	// Create employee
	const { data: employee } = await createEmployeeFromUser(
		{
			organizationId: organization.id,
			startedWorkOn: new Date().toISOString(),
			tenantId: tenant.id,
			userId: user.id
		},
		auth_token
	);

	// Create user organization team
	const { data: team } = await createOrganizationTeamRequest(
		{
			name: body.team,
			tenantId: tenant.id,
			organizationId: organization.id,
			managerIds: [employee.id],
			public: true // By default team should be public,
		},
		auth_token
	);

	const { data: refreshTokenRes } = await refreshTokenRequest(loginRes.refresh_token);
	auth_token = refreshTokenRes.token;

	setAuthCookies(
		{
			access_token: auth_token,
			refresh_token: {
				token: loginRes.refresh_token
			},
			timezone: body['timezone'],
			teamId: team.id,
			tenantId: tenant.id,
			organizationId: organization.id,
			languageId: 'en', // TODO: not sure what should be here
			userId: user.id
		},
		{ req, res: response }
	);

	return response;
}
