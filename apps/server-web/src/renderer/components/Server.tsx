import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface IServerSetting {
  PORT: number;
  GAUZY_API_SERVER_URL: string;
  NEXT_PUBLIC_GAUZY_API_SERVER_URL: string;
}

type Props = {
  serverSetting: IServerSetting;
  saveSetting: (data: IServerSetting) => void;
  Popup: JSX.Element;
};

export const ServerComponent = (props: Props) => {
  const { t } = useTranslation();
  const [serverSetting, setServerSetting] = useState<IServerSetting>(
    props.serverSetting,
  );
  // useEffect(() => {}, []);
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
      <div className="relative overflow-y-auto overflow-x-hidden flex-grow left-16 top-16 w-3/4">
        <form method="post" onSubmit={saveSetting}>
          <div className="flex items-center">
            <div className="flex w-3/4 flex-wrap">
              <div className="md:flex md:items-center mb-6 w-full">
                <div className="md:w-1/3">
                  <label
                    className="block text-gray-500 font-bold md:text-left mb-1 md:mb-0 pr-4"
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
              <div className="md:flex md:items-center mb-6 w-full">
                <div className="md:w-1/3">
                  <label
                    className="block text-gray-500 font-bold md:text-left mb-1 md:mb-0 pr-4"
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
              <div className="md:flex md:items-center mb-6 w-full">
                <div className="md:w-1/3">
                  <label
                    className="block text-gray-500 font-bold md:text-left mb-1 md:mb-0 pr-4"
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

          <button
            className="mx-auto mt-10 block rounded-xl border-4 border-transparent bg-blue-400 px-6 py-3 text-center text-base font-medium text-blue-100 outline-8 hover:outline hover:duration-300"
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
