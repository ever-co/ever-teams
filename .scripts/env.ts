import {
    cleanEnv, str, bool, num
} from 'envalid';


export type Env = Readonly<{
    PLATFORM_LOGO: string;
    DESKTOP_SERVER_WEB_APP_NAME: string;
    DEKSTOP_SERVER_WEB_APP_DESCRIPTION: string;
    DESKTOP_SERVER_WEB_APP_ID: string;
    DESKTOP_SERVER_WEB_APP_REPO_NAME: string;
    DESKTOP_SERVER_WEB_APP_REPO_OWNER: string;
    DESKTOP_SERVER_WEB_APP_WELCOME_TITLE: string;
    DESKTOP_SERVER_WEB_APP_WELCOME_CONTENT: string;
    DESKTOP_SERVER_WEB_APP_DESKTOP_APP_LOGO_512X512: string;
    DESKTOP_SERVER_WEB_APP_DEFAULT_PORT: number;
    DESKTOP_SERVER_WEB_APP_DEFAULT_API_URL: string;
    I18N_FILES_URL: string;
}>


export const env = cleanEnv(process.env, {
    PLATFORM_LOGO: str({
        default: 'assets/images/image/logo/logo_gauzy.svg'
    }),
    DESKTOP_SERVER_WEB_APP_NAME: str({
        default: 'ever-teams-server-web'
    }),
    DEKSTOP_SERVER_WEB_APP_DESCRIPTION: str({
        default: 'Ever Teams Server Web'
    }),
    DESKTOP_SERVER_WEB_APP_ID: str({
        default: 'com.ever.teams.serverweb'
    }),
    DESKTOP_SERVER_WEB_APP_REPO_NAME: str({
        default: 'ever-teams-web-server'
    }),
    DESKTOP_SERVER_WEB_APP_REPO_OWNER: str({
        default: 'ever-co'
    }),
    DESKTOP_SERVER_WEB_APP_WELCOME_TITLE: str({
        default: 'Welcome to Ever Teams Web Server'
    }),
    DESKTOP_SERVER_WEB_APP_WELCOME_CONTENT: str({
        default: 'Ever Teams Web Server is a web application that allows you to manage your teams and projects.'
    }),
    DESKTOP_SERVER_WEB_APP_DESKTOP_APP_LOGO_512X512: str({
        default: 'assets/icons/icon_512x512.png'
    }),
    DESKTOP_SERVER_WEB_APP_DEFAULT_PORT: num({
        default: 3333
    }),
    DESKTOP_SERVER_WEB_APP_DEFAULT_API_URL: str({
        default: 'http://localhost:3000'
    }),
    I18N_FILES_URL: str({ default: '' }),
});
