export interface WebServer {
    PORT: number;
    NEXT_PUBLIC_GAUZY_API_SERVER_URL: string;
    GAUZY_API_SERVER_URL: string;
    [key: string]: any;
}