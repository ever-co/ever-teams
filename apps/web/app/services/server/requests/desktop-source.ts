import getConfig from 'next/config';

export function getDesktopConfig() {
    try {
        const { serverRuntimeConfig } = getConfig();
        return serverRuntimeConfig;
    } catch (error) {
        console.log('skip get server runtime config');
        return {};
    }
}
