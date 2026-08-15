import { useState } from 'react';
import { IServerSetting } from '../libs/interfaces';

/**
 * Encapsulates server-setting form state and the three handlers that are
 * shared between the Settings page (Server.tsx) and the setup wizard
 * (AdvancedSetting.tsx): field changes, SSL toggle, and file-browser.
 */
export const useServerSetting = (initialSetting: IServerSetting) => {
    const [serverSetting, setServerSetting] = useState<IServerSetting>(initialSetting);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = event.target;
        setServerSetting((prev) => ({ ...prev, [id]: value }));
    };

    const handleToggleSsl = () => {
        setServerSetting((prev) => ({
            ...prev,
            useSsl: !prev.useSsl,
            sslKey: !prev.useSsl ? prev.sslKey : '',
            sslSecret: !prev.useSsl ? prev.sslSecret : '',
        }));
    };

    const browseFile = async (field: 'sslKey' | 'sslSecret') => {
        const result = await window.electron.ipcRenderer.invoke('open-file-dialog', {
            filters: [
                { name: 'PEM Files', extensions: ['pem', 'crt', 'key', 'cert'] },
                { name: 'All Files', extensions: ['*'] },
            ],
        });
        if (result && !result.canceled && result.filePaths.length > 0) {
            setServerSetting((prev) => ({ ...prev, [field]: result.filePaths[0] }));
        }
    };

    return { serverSetting, setServerSetting, handleChange, handleToggleSsl, browseFile };
};
