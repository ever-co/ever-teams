import { IContentGenerator } from '../intefaces/i-content-generator';
import { IDesktopEnvironment } from '../intefaces/i-desktop-environment';

export class DesktopServerWebEnvironmentContent implements IContentGenerator {
    public generate(variable: Partial<IDesktopEnvironment>): string {
        return `
            NAME: '${variable.DESKTOP_WEB_SERVER_APP_NAME || variable.NAME}',
            DESCRIPTION: '${variable.DESKTOP_WEB_SERVER_APP_DESCRIPTION || variable.DESCRIPTION}',
            APP_ID: '${variable.DESKTOP_WEB_SERVER_APP_ID || variable.APP_ID}',
            REPO_NAME: '${variable.DESKTOP_WEB_SERVER_APP_REPO_NAME || variable.REPO_NAME}',
            REPO_OWNER: '${variable.DESKTOP_WEB_SERVER_APP_REPO_OWNER || variable.REPO_OWNER}',
            WELCOME_TITLE: '${variable.DESKTOP_WEB_SERVER_APP_WELCOME_TITLE || variable.WELCOME_TITLE}',
            WELCOME_CONTENT: '${variable.DESKTOP_WEB_SERVER_APP_WELCOME_CONTENT || variable.WELCOME_CONTENT}',
            PLATFORM_LOGO: '${variable.PLATFORM_LOGO}',
            GAUZY_DESKTOP_LOGO_512X512: '${variable.GAUZY_DESKTOP_LOGO_512X512}',
            DESKTOP_WEB_SERVER_APP_DEFAULT_API_URL: '${variable.GAUZY_API_SERVER_URL}',
            DESKTOP_WEB_SERVER_APP_DEFAULT_PORT: '${variable.DESKTOP_WEB_SERVER_APP_DEFAULT_PORT}',
            GAUZY_API_SERVER_URL: '${variable.GAUZY_API_SERVER_URL}',
            NEXT_PUBLIC_GAUZY_API_SERVER_URL: '${variable.NEXT_PUBLIC_GAUZY_API_SERVER_URL}',
            DESKTOP_WEB_SERVER_HOSTNAME: '${variable.DESKTOP_WEB_SERVER_HOSTNAME}',
            TERM_OF_SERVICE: '${variable.TERM_OF_SERVICE}',
            PRIVACY_POLICY: '${variable.PRIVACY_POLICY}',
            AUTH_SECRET: '${variable.AUTH_SECRET}'
        `;
    }
}
