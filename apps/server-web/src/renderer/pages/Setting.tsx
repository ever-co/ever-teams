import { useState, useEffect } from 'react';
import { SideBar } from '../components/SideBar';

export function Setting() {
  const [serverSetting, setServerSetting] = useState({
    PORT: 3002,
    GAUZY_API_SERVER_URL: '',
    NEXT_PUBLIC_GAUZY_API_SERVER_URL: '',
  });
  const saveSetting = (e: any) => {
    e.preventDefault();
    // const form = e.target;

    window.electron.ipcRenderer.sendMessage('save_setting', serverSetting);
  };

  const handleChange = (event:any) => {
    const { id, value } = event.target;
    console.log('name', id);
    console.log('value', value);
    setServerSetting((prevData) => ({ ...prevData, [id]: value }));
  };

  useEffect(() => {
    window.electron.ipcRenderer.on('load_setting', (arg: any) => {
      setServerSetting({
        PORT: arg.PORT,
        GAUZY_API_SERVER_URL: arg.GAUZY_API_SERVER_URL,
        NEXT_PUBLIC_GAUZY_API_SERVER_URL: arg.NEXT_PUBLIC_GAUZY_API_SERVER_URL,
      });
    });
  }, []);

  return (
    <SideBar>
      <form method="post" onSubmit={saveSetting}>
        <div className="flex items-center">
          <div className="flex w-3/4 flex-wrap">
          <div className="md:flex md:items-center mb-6 w-full">
            <div className="md:w-1/3">
              <label className="block text-gray-500 font-bold md:text-left mb-1 md:mb-0 pr-4" htmlFor="inline-full-name">
                Port
              </label>
            </div>
            <div className="md:w-2/3">
              <input
                className="bg-gray-200 appearance-none border-2 border-gray-200 rounded w-full py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-blue-500"
                id="Port"
                type="text"
                placeholder="Port"
                value={serverSetting.PORT}
                onChange={handleChange}
              />
            </div>
          </div>
          <div className="md:flex md:items-center mb-6 w-full">
            <div className="md:w-1/3">
              <label className="block text-gray-500 font-bold md:text-left mb-1 md:mb-0 pr-4" htmlFor="inline-full-name">
                Gauzy Api Server URL
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
              <label className="block text-gray-500 font-bold md:text-left mb-1 md:mb-0 pr-4" htmlFor="inline-full-name">
                Public Gauzy Api Server URL
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
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white"
          type="submit"
        >
          Save Setting
        </button>
      </form>
    </SideBar>
  );
}
