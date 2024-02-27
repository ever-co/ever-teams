import {
	APP_LOGO_URL,
	APP_NAME,
	APP_SIGNATURE,
	VERIFY_EMAIL_CALLBACK_PATH,
	VERIFY_EMAIL_CALLBACK_URL,
	smtpConfiguration
} from '@app/constants';
import { authFormValidate, generateToken, setAuthCookies } from '@app/helpers';
import {
	ICreateEmployee,
	IEmployee,
	ILoginResponse,
	IOrganization,
	IOrganizationCreate,
	IOrganizationTeam,
	IRegisterDataAPI,
	IRegisterDataRequest,
	ITenant,
	IUser,
	I_SMTP
} from '@app/interfaces';
import { post } from '../../axios';
import { createOrganizationTeamGauzy } from '../organization-team';
import { AxiosResponse } from 'axios';

const registerDefaultValue = {
	appName: APP_NAME,
	appSignature: APP_SIGNATURE,
	appLogo: APP_LOGO_URL
};

export function registerUserAPI(data: IRegisterDataRequest) {
	const body = {
		...data,
		...registerDefaultValue,
		appEmailConfirmationUrl: VERIFY_EMAIL_CALLBACK_URL || data.appEmailConfirmationUrl
	};

	return post<IUser>('/auth/register', body).then(({ data }) => data);
}

export function loginUserAPI(email: string, password: string) {
	return post<ILoginResponse>('/auth/login', { email, password }).then(({ data }) => data);
}

export function createTenantAPI(name: string, bearer_token: string) {
	return post<ITenant>(
		'/tenant',
		{ name },
		{
			headers: { Authorization: `Bearer ${bearer_token}` }
		}
	).then(({ data }) => data);
}

export function createTenantSmtpAPI({ tenantId, access_token }: { tenantId: string; access_token: string }) {
	const config = smtpConfiguration();

	console.log(`SMTP Config: ${JSON.stringify(config)}`);

	return post<I_SMTP>('/smtp', config, {
		tenantId,
		headers: { Authorization: `Bearer ${access_token}` }
	});
}

export function createOrganizationAPI(datas: IOrganizationCreate, bearer_token: string) {
	return post<IOrganization>('/organization', datas, {
		headers: { Authorization: `Bearer ${bearer_token}` }
	}).then(({ data }) => data);
}

export function createEmployeeFromUserAPI(data: ICreateEmployee, bearer_token: string) {
	return post<IEmployee>('/employee', data, {
		tenantId: data.tenantId,
		headers: { Authorization: `Bearer ${bearer_token}` }
	}).then(({ data }) => data);
}

export const refreshTokenAPI = (refresh_token: string) => {
	return post<{ token: string }>('/auth/refresh-token', {
		refresh_token
	}).then(({ data }) => data);
};

export async function registerGauzy(body: IRegisterDataAPI) {
	const appEmailConfirmationUrl = `${location.origin}${VERIFY_EMAIL_CALLBACK_PATH}`;

	const noRecaptchaArray = ['email', 'name', 'team'];

	const validationFields = noRecaptchaArray;

	const { errors, valid: formValid } = authFormValidate(validationFields, body);

	if (!formValid) {
		return Promise.reject({ errors });
	}

	const password = generateToken(8);
	const names = body.name.split(' ');

	const user = await registerUserAPI({
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
	const loginRes = await loginUserAPI(body.email, password);
	let auth_token = loginRes.token;

	const tenant = await createTenantAPI(body.email, auth_token);

	// TODO: This function should be implemented from Gauzy
	// Create tenant SMTP
	// await createTenantSmtpRequest({
	// 	access_token: auth_token,
	// 	tenantId: tenant.id
	// });

	// Create user organization
	const organization = await createOrganizationAPI(
		{
			currency: 'USD',
			name: body.team,
			tenantId: tenant.id,
			invitesAllowed: true
		},
		auth_token
	);

	// Create employee
	const employee = await createEmployeeFromUserAPI(
		{
			organizationId: organization.id,
			startedWorkOn: new Date().toISOString(),
			tenantId: tenant.id,
			userId: user.id
		},
		auth_token
	);

	const { data: team } = await createOrganizationTeamGauzy(
		{
			name: body.team,
			tenantId: tenant.id,
			organizationId: organization.id,
			managerIds: [employee.id],
			public: true // By default team should be public,
		},
		auth_token
	);

	const refreshTokenRes = await refreshTokenAPI(loginRes.refresh_token);
	auth_token = refreshTokenRes.token;

	setAuthCookies({
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
	});

	const response: AxiosResponse<{ loginRes: ILoginResponse; team: IOrganizationTeam; employee: IEmployee }> = {
		data: { loginRes, team, employee },
		status: 200,
		statusText: '',
		headers: {},
		config: {} as any
	};

	return Promise.resolve(response);
}
