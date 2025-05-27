import {
	APP_LOGO_URL,
	APP_NAME,
	APP_SIGNATURE,
	GAUZY_API_BASE_SERVER_URL,
	smtpConfiguration,
	VERIFY_EMAIL_CALLBACK_PATH,
	VERIFY_EMAIL_CALLBACK_URL
} from '@/core/constants/config/constants';
import { APIService } from '../../api.service';
import { authFormValidate } from '@/core/lib/helpers/validations';
import { generateToken } from '@/core/lib/helpers/generate-token';
import { setAuthCookies } from '@/core/lib/helpers/cookies';
import { AxiosResponse } from 'axios';
import { tenantService } from '../tenants/tenant.service';
import { employeeService, organizationTeamService } from '../organizations/teams';
import { IAuthResponse, IRegisterDataRequest } from '@/core/types/interfaces/auth/IAuth';
import { IOrganization, IOrganizationCreate } from '@/core/types/interfaces/organization/IOrganization';
import { IOrganizationTeam } from '@/core/types/interfaces/team/IOrganizationTeam';
import { IRegisterDataAPI } from '@/core/types/interfaces/auth/IAuth';
import { IUser } from '@/core/types/interfaces/user/IUser';
import { ICustomSmtp } from '@/core/types/interfaces/smpt/ICustomSmtp';
import { IOrganizationTeamEmployee } from '@/core/types/interfaces/team/IOrganizationTeamEmployee';

class RegisterService extends APIService {
	protected registerDefaultValue = {
		appName: APP_NAME,
		appSignature: APP_SIGNATURE,
		appLogo: APP_LOGO_URL
	};

	registerUser = async (data: IRegisterDataRequest) => {
		const body = {
			...data,
			...this.registerDefaultValue,
			appEmailConfirmationUrl: VERIFY_EMAIL_CALLBACK_URL || data.appEmailConfirmationUrl
		};

		return this.post<IUser>('/auth/register', body).then(({ data }) => data);
	};

	loginUser = async (email: string, password: string) => {
		return this.post<IAuthResponse>('/auth/login', { email, password }).then(({ data }) => data);
	};

	createTenantSmtp = async ({ tenantId, access_token }: { tenantId: string; access_token: string }) => {
		const config = smtpConfiguration();

		console.log(`SMTP Config: ${JSON.stringify(config)}`);

		return this.post<ICustomSmtp>('/smtp', config, {
			tenantId,
			headers: { Authorization: `Bearer ${access_token}` }
		});
	};

	createOrganization = async (datas: IOrganizationCreate, bearer_token: string) => {
		return this.post<IOrganization>('/organization', datas, {
			headers: { Authorization: `Bearer ${bearer_token}` }
		}).then(({ data }) => data);
	};

	refreshToken = async (refresh_token: string) => {
		return this.post<{ token: string }>('/auth/refresh-token', {
			refresh_token
		}).then(({ data }) => data);
	};

	registerGauzy = async (body: IRegisterDataAPI) => {
		const appEmailConfirmationUrl = `${location.origin}${VERIFY_EMAIL_CALLBACK_PATH}`;

		const validationFields = ['email', 'name', 'team'];

		const { errors, valid: formValid } = authFormValidate(validationFields, body);

		if (!formValid) {
			return Promise.reject({ errors });
		}

		const password = generateToken(8);
		const names = body.name.split(' ');

		const user = await this.registerUser({
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
		const loginRes = await this.loginUser(body.email, password);
		let auth_token = loginRes.token;

		const tenant = await tenantService.createTenant(body.email, auth_token);

		// TODO: This  should be implemented from Gauzy
		// Create tenant SMTP
		// await createTenantSmtpRequest({
		// 	access_token: auth_token,
		// 	tenantId: tenant.id
		// });

		// Create user organization
		const organization = await this.createOrganization(
			{
				currency: 'USD',
				name: body.team,
				tenantId: tenant.id,
				invitesAllowed: true
			},
			auth_token
		);

		// Create employee
		const employee = await employeeService.createEmployeeFromUser(
			{
				organizationId: organization.id,
				startedWorkOn: new Date(),
				tenantId: tenant.id,
				userId: user.id
			},
			auth_token
		);

		const { data: team } = await organizationTeamService.createOrganizationTeamGauzy(
			{
				name: body.team,
				tenantId: tenant.id,
				organizationId: organization.id,
				managerIds: [employee.id],
				public: true // By default team should be public,
			},
			auth_token
		);

		const refreshTokenRes = await this.refreshToken(loginRes.refresh_token);
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

		const response: AxiosResponse<{
			loginRes: IAuthResponse;
			team: IOrganizationTeam;
			employee: IOrganizationTeamEmployee;
		}> = {
			data: { loginRes, team, employee },
			status: 200,
			statusText: '',
			headers: {},
			config: {} as any
		};

		return Promise.resolve(response);
	};
}

export const registerService = new RegisterService(GAUZY_API_BASE_SERVER_URL.value);
