import { useTranslation } from 'react-i18next';
import { IServerSetting } from '../../libs/interfaces';
import { useState } from 'react';
import { SettingPageTypeMessage } from '../../libs/constant';
import { config } from '../../../configs/config';
import { get } from '../../libs/utils/api';
import { ToastComponent } from '../../components/Toast';
type Props = {
  back: () => void;
};

const AdvancedSetting = (props: Props) => {
  const { t } = useTranslation();
  const [serverSetting, setServerSetting] = useState<IServerSetting>({
    PORT: Number(config.DESKTOP_WEB_SERVER_APP_DEFAULT_PORT || 3001),
    GAUZY_API_SERVER_URL:
      config.GAUZY_API_SERVER_URL || 'http://localhost:3000',
    NEXT_PUBLIC_GAUZY_API_SERVER_URL:
      config.NEXT_PUBLIC_GAUZY_API_SERVER_URL || 'http://localhost:3000',
    DESKTOP_WEB_SERVER_HOSTNAME:
      config.DESKTOP_WEB_SERVER_HOSTNAME || '127.0.0.1',
  });

  const [errorConnection, setErrorConnection] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const saveSetting = (e: any) => {
    e.preventDefault();
    setLoading(true);
    window.electron.ipcRenderer.sendMessage('setting-page', {
      data: serverSetting,
      type: SettingPageTypeMessage.saveSetting,
      isSetup: true,
    });
  };

  const checkConnection = async () => {
    try {
      setLoading(true);
      await get(serverSetting.GAUZY_API_SERVER_URL, '/api');
      setLoading(false);
      setErrorConnection(false);
      setToastShow(true);
    } catch (error) {
      console.log(error);
      setErrorConnection(true);
      setToastShow(true);
      setLoading(false);
    }
  };
  const handleChange = (event: any) => {
    const { id, value } = event.target;
    setServerSetting((prevData: any) => ({ ...prevData, [id]: value }));
  };

  const closeToast = () => {
    setToastShow(false);
  };

  const [toastShow, setToastShow] = useState<boolean>(false);
  return (
    <>
      <div className="text-center mt-8 mb-12 text-gray-700 dark:text-gray-200">
        <h1 className="text-2xl font-bold mb-2">
          Are you ready for some advanced settings?
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          This is the final step where you can get to the nitty-gritty of your
          Gauzy Platform.
        </p>
      </div>

      {/* Input Fields */}
      <form method="post" onSubmit={saveSetting}>
        <div className="rounded-lg px-16 py-10 mt-5">
          <div className="flex items-center">
            <div className="flex w-full flex-wrap">
              <div className="md:flex md:items-center mb-5 w-full">
                <div className="md:w-1/3">
                  <label
                    className="block text-gray-500 font-bold md:text-left mb-1 md:mb-0 pr-4"
                    htmlFor="inline-full-name"
                  >
                    {t('FORM.LABELS.SERVER_CONFIG')}
                  </label>
                </div>
              </div>
              <div className="md:flex md:items-center mb-3 w-full">
                <div className="md:w-1/3">
                  <label
                    className="block text-gray-400 md:text-left mb-1 md:mb-0 pr-4"
                    htmlFor="inline-full-name"
                  >
                    {t('FORM.FIELDS.PORT')}
                  </label>
                </div>
                <div className="md:w-2/3">
                  <input
                    className="bg-gray-200 appearance-none border-2 border-gray-200 rounded w-full py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-blue-500"
                    id="PORT"
                    type="text"
                    placeholder="Port"
                    value={serverSetting.PORT}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="md:flex md:items-center mb-3 w-full">
                <div className="md:w-1/3">
                  <label
                    className="block text-gray-400 md:text-left mb-1 md:mb-0 pr-4"
                    htmlFor="inline-full-name"
                  >
                    {t('FORM.FIELDS.GAUZY_API_SERVER_URL')}
                  </label>
                </div>
                <div className="md:w-2/3">
                  <input
                    className="bg-gray-200 appearance-none border-2 border-gray-200 rounded w-full py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-blue-500"
                    id="GAUZY_API_SERVER_URL"
                    type="text"
                    placeholder="http://localhost:3000"
                    value={serverSetting.GAUZY_API_SERVER_URL}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="md:flex md:items-center mb-3 w-full">
                <div className="md:w-1/3">
                  <label
                    className="block text-gray-400 md:text-left mb-1 md:mb-0 pr-4"
                    htmlFor="inline-full-name"
                  >
                    {t('FORM.FIELDS.NEXT_PUBLIC_GAUZY_API_SERVER_URL')}
                  </label>
                </div>
                <div className="md:w-2/3">
                  <input
                    className="bg-gray-200 appearance-none border-2 border-gray-200 rounded w-full py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-blue-500"
                    id="NEXT_PUBLIC_GAUZY_API_SERVER_URL"
                    type="text"
                    placeholder="http://localhost:3000"
                    value={serverSetting.NEXT_PUBLIC_GAUZY_API_SERVER_URL}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Buttons */}
        <div className="flex justify-between items-center w-full mx-auto mt-auto mb-8 mt-16">
          <button
            type="button"
            onClick={() => {
              props.back();
            }}
            className="flex items-center bg-gray-800 text-white py-3 px-6 rounded-full hover:bg-gray-700"
          >
            <span className="mr-2">←</span> BACK
          </button>
          <div className="flex">
            <button
              type="button"
              onClick={() => {
                checkConnection();
              }}
              className="flex items-center bg-green-600 text-white py-3 px-6 rounded-full hover:bg-green-700 ml-8"
              disabled={loading}
            >
              {loading ? (
                <div className="w-5 h-5 border-4 border-blue-500 border-dotted rounded-full animate-spin"></div>
              ) : (
                <span className="mr-2">✔</span>
              )}
              Check
            </button>
            <button
              name="save_setting"
              type="submit"
              className="flex items-center bg-purple-600 text-white py-3 px-6 rounded-full hover:bg-purple-700 ml-8"
            >
              {loading ? (
                <div className="w-5 h-5 border-4 border-blue-500 border-dotted rounded-full animate-spin"></div>
              ) : (
                <span className="mr-2">💾</span>
              )}
              Save
            </button>
          </div>
        </div>
      </form>
      <div className="absolute top-0 right-0">
        <ToastComponent
          show={toastShow}
          title="MESSAGE.INFO"
          message={
            errorConnection
              ? 'MESSAGE.CONNECTION_ERROR'
              : 'MESSAGE.CONNECTION_SUCCESS'
          }
          onClose={closeToast}
          autoClose={true}
          timeout={2000}
          type={errorConnection ? 'error' : 'success'}
        />
      </div>
    </>
  );
};

export default AdvancedSetting;
