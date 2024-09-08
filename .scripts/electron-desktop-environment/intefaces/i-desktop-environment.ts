import { Env } from '../../env';

export interface IDesktopEnvironment extends Env {
    NAME: string;
    DESCRIPTION: string;
    APP_ID: string;
    REPO_NAME: string;
    REPO_OWNER: string;
    WELCOME_TITLE: string;
    WELCOME_CONTENT: string;
    PLATFORM_LOGO: string;
    DESKTOP_SERVER_WEB_APP_DESKTOP_APP_LOGO_512X512: string;
}
