import { EverTeamsLogo } from '../../components/svgs/index';
import { config } from '../../../configs/config';
import { useTranslation } from 'react-i18next';
type props = {
  nextAction: () => void;
};
const Landing = (props: props) => {
  const { t } = useTranslation();
  return (
    <div className="w-full">
      <div className="mb-6 ml-10">
        <select className="dark:bg-gray-800 text-gray-700 dark:text-white py-2 px-4 rounded-lg border-2 dark:border-none">
          <option>English</option>
          {/* Add other language options here */}
        </select>
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
