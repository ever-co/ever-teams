import { EverTeamsLogo } from './svgs';
import { IAbout } from '../libs/interfaces';
import {
  APP_LINK,
  IPC_TYPES,
  SettingPageTypeMessage,
} from '../../main/helpers/constant';
import { Link } from 'react-router-dom';

export const AboutComponent = (props: IAbout) => {
  const handleLinkClick = (linkType: string) => {
    window.electron.ipcRenderer.sendMessage(IPC_TYPES.SETTING_PAGE, {
      type: SettingPageTypeMessage.linkAction,
      data: {
        linkType,
      },
    });
  };
  return (
    <div className="w-full text-white rouded-3xl" style={{minHeight: '700px'}}>
      <div className="text-center mt-8">
        <div className="flex justify-center items-center mb-4">
          <EverTeamsLogo />
        </div>
        <p className="text-xs dark:text-gray-50 text-gray-900 tracking-tighter">
          Version v{props.version}
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
  );
};
