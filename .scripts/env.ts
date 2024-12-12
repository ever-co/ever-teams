import {
    cleanEnv, str, num
} from 'envalid';


export type Env = Readonly<{
    PLATFORM_LOGO: string;
    DESKTOP_WEB_SERVER_APP_NAME: string;
    DESKTOP_WEB_SERVER_APP_DESCRIPTION: string;
    DESKTOP_WEB_SERVER_APP_ID: string;
    DESKTOP_WEB_SERVER_APP_REPO_NAME: string;
    DESKTOP_WEB_SERVER_APP_REPO_OWNER: string;
    DESKTOP_WEB_SERVER_APP_WELCOME_TITLE: string;
    DESKTOP_WEB_SERVER_APP_WELCOME_CONTENT: string;
    GAUZY_DESKTOP_LOGO_512X512: string;
    DESKTOP_WEB_SERVER_APP_DEFAULT_PORT: number;
    DESKTOP_WEB_SERVER_APP_DEFAULT_API_URL: string;
    I18N_FILES_URL: string;
    COMPANY_SITE_LINK: string;
    COMPANY_GITHUB_LINK: string;
    GAUZY_API_SERVER_URL: string;
    NEXT_PUBLIC_GAUZY_API_SERVER_URL: string;
    DESKTOP_WEB_SERVER_HOSTNAME: string;
    TERM_OF_SERVICE: string;
    PRIVACY_POLICY: string;
}>

export const env = cleanEnv(process.env, {
    COMPANY_SITE_LINK: str({
        default: 'https://ever.team/'
    }),
    COMPANY_GITHUB_LINK: str({
        default: 'https://github.com/ever-co/ever-teams'
    }),
    PLATFORM_LOGO: str({
        default: 'https://app.ever.team/assets/ever-teams.png'
    }),
    DESKTOP_WEB_SERVER_APP_NAME: str({
        default: 'ever-teams-server-web'
    }),
    DESKTOP_WEB_SERVER_APP_DESCRIPTION: str({
        default: 'Ever Teams Server Web'
    }),
    DESKTOP_WEB_SERVER_APP_ID: str({
        default: 'com.ever.teams.serverweb'
    }),
    DESKTOP_WEB_SERVER_APP_REPO_NAME: str({
        default: 'ever-teams-web-server'
    }),
    DESKTOP_WEB_SERVER_APP_REPO_OWNER: str({
        default: 'ever-co'
    }),
    DESKTOP_WEB_SERVER_APP_WELCOME_TITLE: str({
        default: 'Welcome to Ever Teams Web Server'
    }),
    DESKTOP_WEB_SERVER_APP_WELCOME_CONTENT: str({
        default: 'Ever Teams Web Server is a web application that allows you to manage your teams and projects.'
    }),
    DESKTOP_WEB_SERVER_APP_DESKTOP_APP_LOGO_512X512: str({
        default: 'assets/icons/desktop_logo_512x512.png'
    }),
    DESKTOP_WEB_SERVER_APP_DEFAULT_PORT: num({
        default: 3333
    }),
    DESKTOP_WEB_SERVER_APP_DEFAULT_API_URL: str({
        default: 'http://localhost:3000'
    }),
    I18N_FILES_URL: str({ default: '' }),
    GAUZY_API_SERVER_URL: str({ default: 'http://localhost:3000' }),
    NEXT_PUBLIC_GAUZY_API_SERVER_URL: str({ default: 'http://localhost:3000' }),
    DESKTOP_WEB_SERVER_HOSTNAME: str({
        default: '0.0.0.0', // let's use the same one for now for all envs
        desc: 'WARNING: Using 0.0.0.0 binds to all network interfaces. Use with caution in production.'
    }),
    TERM_OF_SERVICE: str({
        default: 'https://ever.team/tos'
    }),
    PRIVACY_POLICY: str({
        default: 'https://ever.team/privacy'
    })
});
