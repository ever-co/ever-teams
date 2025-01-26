import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ISidebarComponent } from '../libs/interfaces';
import { ThemeToggler } from './Toggler';
import LanguageSelector from './LanguageSelector';
import Container from './container';
import WindowControl from './window-control';
import { useEffect, useState } from 'react';
import { WindowTypes } from '../../main/helpers/constant';
import { IDevices } from '../../main/helpers/interfaces';

export function SideBar({
  children,
  menus,
  menuChange,
  lang,
}: ISidebarComponent) {
  const [platform, setPlatform] = useState<IDevices>('win32');
  const { t } = useTranslation();
  const getPlatform = async () => {
    const devicePlatform = await window.electron.ipcRenderer.invoke('get-platform');
    setPlatform(devicePlatform);
  }
  useEffect(() => {
    getPlatform();
  }, [])
  return (
    <>
      {platform === 'darwin' && (
        <WindowControl windowTypes={WindowTypes.SETTING_WINDOW}/>
      )}
    <Container>
      <div className="fixed flex flex-col top-0 left-0 h-full w-1/4 dark:bg-[#2b2b2f] bg-gray-200 rounded-3xl">
        <div className="overflow-y-auto overflow-x-hidden flex-grow rounded-3xl content-start">
          <ul className="flex flex-col py-4 space-y-1">
            {menus.length > 0 &&
              menus.map((menu) => (
                <li key={menu.key}>
                  <Link
                    to=""
                    className={`relative flex flex-row items-center h-11 focus:outline-none  text-gray-600 dark:text-white  ${!menu.isActive ? 'hover:dark:bg-[#1f2025] hover:bg-stone-100 border-indigo-500' : 'bg-stone-100 dark:bg-[#1f2025]'} text-gray-800 border-l-4 border-transparent ${!menu.isActive ? 'hover:border-indigo-500' : ''} pr-6 rounded-l-lg`}
                    onClick={() => {
                      menuChange(menu.key);
                    }}
                  >
                    <span className="inline-flex justify-center items-center ml-4"></span>
                    <span className="ml-2 text-sm tracking-wide truncate">
                      {t(`MENU.${menu.displayName}`)}
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        </div>
        <div className="flex items-center justify-center py-6 px-2">
          <div className="flex flex-col w-6/8 mr-5">
            <LanguageSelector lang={lang} />
          </div>

          <div className="flex flex-col w-2/8">
            <ThemeToggler />
          </div>
        </div>
      </div>
      <div className="flex flex-col relative left-64 w-3/4 content-start">{children}</div>
    </Container>
    </>
  );
}
