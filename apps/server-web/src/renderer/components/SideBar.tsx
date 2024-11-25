import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ISidebarComponent } from '../libs/interfaces';
import { ThemeToggler } from './Toggler';
import LanguageSelector from './LanguageSelector';

export function SideBar({
  children,
  menus,
  menuChange,
  lang,
}: ISidebarComponent) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex flex-col flex-auto flex-shrink-0 antialiased text-gray-800">
      <div className="fixed flex flex-col top-0 left-0 w-1/4 h-full dark:bg-[#1c1e23] bg-gray-200">
        <div className="overflow-y-auto overflow-x-hidden flex-grow">
          <ul className="flex flex-col py-4 space-y-1">
            {menus.length > 0 &&
              menus.map((menu) => (
                <li key={menu.key}>
                  <Link
                    to=""
                    className={`relative flex flex-row items-center h-11 focus:outline-none  text-gray-600 dark:text-white  ${!menu.isActive ? 'hover:dark:bg-gray-800 hover:bg-gray-300 border-indigo-500' : 'bg-gray-300 dark:bg-gray-800'} text-gray-800 border-l-4 border-transparent ${!menu.isActive ? 'hover:border-indigo-500' : ''} pr-6 rounded-lg`}
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
      <div className="flex flex-col relative left-64 w-3/4">{children}</div>
    </div>
  );
}
