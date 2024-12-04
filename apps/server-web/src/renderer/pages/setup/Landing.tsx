import { EverTeamsLogo } from '../../components/svgs/index';
import { config } from '../../../configs/config';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../../components/LanguageSelector';
import { useEffect, useState } from 'react';
import { ThemeToggler } from '../../components/Toggler';
type props = {
  nextAction: () => void;
};
const Landing = (props: props) => {
  const { t } = useTranslation();
  const [defaultLang, setDefaultLang] = useState<string>('en');

  const getCurrentLanguage = async () => {
    try {
      const lang = await window.electron.ipcRenderer.invoke('current-language');
      setDefaultLang(lang);
    } catch (error) {
      console.error('Failed to get current language:', error);
      setDefaultLang('en'); // Fallback to English
    }
  };

  useEffect(() => {
    getCurrentLanguage();
  }, []);
  return (
    <div className="w-full">
      <div className="flex w-full mb-6 ml-10">
        <div className="flex flex-col w-6/12">
          <div>
            <LanguageSelector lang={defaultLang} />
          </div>
        </div>
        <div className="flex w-6/12 flex-row-reverse mr-10">
          <div className="flex flex-col w-2/8">
            <ThemeToggler />
          </div>
        </div>
      </div>

      <div className="mb-8 w-full text-center">
        <div className="text-center m-auto mt-8 mb-8 w-48 items-center">
          <EverTeamsLogo />
        </div>
        <h1 className="text-2xl font-bold mb-4 dark:text-gray-400 text-gray-700">
          {config.WELCOME_TITLE}
        </h1>
        <p className="dark:text-gray-400 text-gray-500">
          {config.WELCOME_CONTENT}
        </p>
      </div>

      {/* Button */}
      <div className="w-full text-center mt-14">
        <button
          onClick={() => {
            props.nextAction();
          }}
          className="bg-purple-600 hover:bg-purple-700 text-white py-3 px-8 rounded-full m-auto"
        >
          {t('FORM.BUTTON.LETS_GO')}
        </button>
      </div>
    </div>
  );
};

export default Landing;
