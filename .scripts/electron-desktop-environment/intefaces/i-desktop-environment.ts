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
    GAUZY_DESKTOP_LOGO_512X512: string;
    GAUZY_API_SERVER_URL: string
    NEXT_PUBLIC_GAUZY_API_SERVER_URL: string,
    DESKTOP_WEB_SERVER_HOSTNAME: string
}
