interface GeneralConfig {
    lang?: string
    autoUpdate?: boolean
    updateCheckPeriode?: string
    [key: string]: any
}

interface ServerConfig {
    PORT: number;
    NEXT_PUBLIC_GAUZY_API_SERVER_URL: string;
    GAUZY_API_SERVER_URL: string;
    [key: string]: any;
}
export interface WebServer {
    server?: ServerConfig;
    general?: GeneralConfig;
}
