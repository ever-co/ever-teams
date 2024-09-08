import { IContentGenerator } from '../intefaces/i-content-generator';
import { IDesktopEnvironment } from '../intefaces/i-desktop-environment';

export class DesktopServerWebEnvironmentContent implements IContentGenerator {
    public generate(variable: Partial<IDesktopEnvironment>): string {
        return `
            NAME: '${variable.DESKTOP_SERVER_WEB_APP_NAME || variable.NAME},
            DESCRIPTION: '${variable.DEKSTOP_SERVER_WEB_APP_DESCRIPTION || variable.DESCRIPTION}',
            APP_ID: '${variable.DESKTOP_SERVER_WEB_APP_ID || variable.APP_ID}',
            REPO_NAME: '${variable.DESKTOP_SERVER_WEB_APP_REPO_NAME || variable.REPO_NAME}',
            REPO_OWNER: '${variable.DESKTOP_SERVER_WEB_APP_REPO_OWNER || variable.REPO_OWNER}',
            WELCOME_TITLE: '${variable.DESKTOP_SERVER_WEB_APP_WELCOME_TITLE || variable.WELCOME_TITLE}',
            WELCOME_CONTENT: '${variable.DESKTOP_SERVER_WEB_APP_WELCOME_CONTENT || variable.WELCOME_CONTENT}',
        `;
    }
}
