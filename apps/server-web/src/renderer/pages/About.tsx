import { useEffect, useState } from 'react';
import { EverTeamsLogo } from '../components/svgs';
import {
  APP_LINK,
  IPC_TYPES,
  SettingPageTypeMessage,
} from '../../main/helpers/constant';
import { Link } from 'react-router-dom';
import WindowControl from '../components/window-control';
import Container from '../components/container';

const AboutPage = () => {
  const [aboutApp, setAboutApp] = useState<{
    name: string;
    version: string;
  }>({
    name: 'Web Server',
    version: '0.1.0',
  });
  const [platform, setPlatform] = useState('win');

  const handleLinkClick = (linkType: string) => {
    window.electron.ipcRenderer.sendMessage(IPC_TYPES.SETTING_PAGE, {
      type: SettingPageTypeMessage.linkAction,
      data: {
        linkType,
      },
    });
  };

  const getPlatform = async () => {
    const devicePlatform = await window.electron.ipcRenderer.invoke('get-platform');
    setPlatform(devicePlatform);
  }

  useEffect(() => {
    getPlatform();
    window.electron.ipcRenderer.removeEventListener(IPC_TYPES.SETTING_PAGE);
    window.electron.ipcRenderer.on(IPC_TYPES.SETTING_PAGE, (arg: any) => {
      switch (arg.type) {
        case SettingPageTypeMessage.loadSetting:
          setAboutApp({
            name: arg.data.appName,
            version: arg.data.version,
          });
          break;
        default:
          break;
      }
    });
  });
  return (
    <>
      {platform === 'darwin' && (
        <WindowControl />
      )}
      <Container>
        <div className="w-full text-white rounded-lg shadow-md p-6">
          <div className="text-center content-start">
            <div className="flex justify-center items-center mb-4">
              <EverTeamsLogo />
            </div>
            <h1 className="text-sm dark:text-gray-50 text-gray-900 font-semibold pb-1 tracking-tighter">
              {aboutApp.name}
            </h1>
            <p className="text-xs dark:text-gray-50 text-gray-900 tracking-tighter">
              Version v{aboutApp.version}
            </p>
          </div>
          <div className="mt-6 text-center text-xs">
            <p className="dark:text-gray-50 text-gray-900 pb-1">
              Copyright © 2024-Present{' '}
              <span className="text-indigo-500">Ever Co. LTD</span>
            </p>
            <p className="dark:text-gray-50 text-gray-900 pb-1">
              All rights reserved.
            </p>
            <p className="mt-2 text-indigo-500 space-x-2">
              <Link
                to="#"
                onClick={() => {
                  handleLinkClick(APP_LINK.TERM_OF_SERVICE);
                }}
              >
                Terms Of Service
              </Link>
              <span>|</span>
              <Link
                to="#"
                onClick={() => {
                  handleLinkClick(APP_LINK.PRIVACY_POLICY);
                }}
              >
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </Container>
    </>
  );
};

export default AboutPage;
