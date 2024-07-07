import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
interface SideMenu {
  displayName: string;
  key: string;
  isActive: boolean;
}

interface Languages {
  code: string;
  label: string;
}

type Props = {
  children: string | JSX.Element | JSX.Element[];
  menus: SideMenu[];
  menuChange: (key: string) => void;
  langs: Languages[];
  onLangChange: (lang: any) => void;
  lang: string;
};

export function SideBar({
  children,
  menus,
  menuChange,
  langs,
  lang,
  onLangChange,
}: Props) {
  const { t } = useTranslation();
  const language = langs.find((lg) => lg.code === lang) || {
    code: 'en',
    label: 'English',
  };
  return (
    <div className="min-h-screen flex flex-col flex-auto flex-shrink-0 antialiased bg-white text-gray-800">
      <div className="fixed flex flex-col top-0 left-0 w-1/4 bg-gray-50 h-full">
        <div className="overflow-y-auto overflow-x-hidden flex-grow bg-gray-50">
          <ul className="flex flex-col py-4 space-y-1">
            {menus.length > 0 &&
              menus.map((menu) => (
                <li key={menu.key}>
                  <Link
                    to=""
                    className={`relative flex flex-row items-center h-11 focus:outline-none ${!menu.isActive ? 'hover:' : ''}bg-white text-gray-600 ${!menu.isActive ? 'hover:' : ''}text-gray-800 border-l-4 border-transparent ${!menu.isActive ? 'hover:' : ''}border-indigo-500 pr-6`}
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
        <div className="flex items-center justify-center p-12">
          <div className=" relative inline-block text-left dropdown">
            <span className="rounded-md shadow-sm">
              <button
                className="inline-flex justify-center w-full px-4 py-2 text-sm font-medium leading-5 text-gray-700 transition duration-150 ease-in-out bg-white border border-gray-300 rounded-md hover:text-gray-500 focus:outline-none focus:border-blue-300 focus:shadow-outline-blue active:bg-gray-50 active:text-gray-800"
                type="button"
                aria-haspopup="true"
                aria-expanded="true"
                aria-controls="headlessui-menu-items-117"
              >
                <span>{language.label}</span>
                <svg
                  className="w-5 h-5 ml-2 -mr-1"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              </button>
            </span>
            <div className="opacity-0 invisible dropdown-menu transition-all duration-300 transform origin-top-right -translate-y-2 scale-95">
              <div
                className="absolute right-0 bottom-10 w-32 mt-2 origin-top-right bg-white border border-gray-200 divide-y divide-gray-100 rounded-md shadow-lg outline-none"
                aria-labelledby="headlessui-menu-button-1"
                id="headlessui-menu-items-117"
                role="menu"
              >
                <div className="py-1">
                  {langs.length > 0 &&
                    langs.map((lang) => (
                      <Link
                        key={lang.code}
                        to={''}
                        tabIndex={0}
                        className="text-gray-700 flex justify-between w-full px-4 py-2 text-sm leading-5 text-center"
                        role="menuitem"
                        onClick={() => {
                          onLangChange(lang);
                        }}
                      >
                        {lang.label}
                      </Link>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col relative left-64 w-3/4">{children}</div>
    </div>
  );
}
