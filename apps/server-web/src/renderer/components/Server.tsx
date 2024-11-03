import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IServerSetting, IServerComponent } from '../libs/interfaces';

export const ServerComponent = (props: IServerComponent) => {
  const { t } = useTranslation();
  const [serverSetting, setServerSetting] = useState<IServerSetting>(
    props.serverSetting,
  );
  const saveSetting = (e: any) => {
    e.preventDefault();

    props.saveSetting(serverSetting);
  };
  const handleChange = (event: any) => {
    const { id, value } = event.target;
    setServerSetting((prevData: any) => ({ ...prevData, [id]: value }));
  };
  return (
    <>
      <div className="relative overflow-y-auto overflow-x-hidden flex-grow left-8 w-11/12 min-h-screen">
        <form method="post" onSubmit={saveSetting}>
          <div className="rounded-lg bg-gray-50 dark:bg-[#25272D] px-16 py-10 mt-5 border-2 border-gray-200 dark:border-gray-600">
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
          <button
            className="ml-2 mt-10 block rounded-lg border-4 border-transparent bg-violet-800 px-6 py-2 text-center text-base font-medium text-gray-200 outline-8"
            type="submit"
          >
            {t('FORM.BUTTON.SAVE_SETTING')}
          </button>
        </form>
      </div>
      {props.Popup}
    </>
  );
};
