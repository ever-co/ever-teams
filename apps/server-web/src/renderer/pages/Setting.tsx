import { useState, useEffect } from 'react';

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

  const handleChange = (event) => {
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
    <>
      <div className="mx-4 min-h-screen max-w-screen-xl sm:mx-8 xl:mx-auto">
        <h1 className="border-b py-6 text-4xl font-semibold">Settings</h1>
        <div className="grid grid-cols-8 pt-3 sm:grid-cols-10">
          <div className="relative my-4 w-56 sm:hidden">
            <input
              className="peer hidden"
              type="checkbox"
              name="select-1"
              id="select-1"
            />
            <label
              htmlFor="select-1"
              className="flex w-full cursor-pointer select-none rounded-lg border p-2 px-3 text-sm text-gray-700 ring-blue-700 peer-checked:ring"
            >
              Accounts{' '}
            </label>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="pointer-events-none absolute right-0 top-3 ml-auto mr-5 h-4 text-slate-700 transition peer-checked:rotate-180"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
            <ul className="max-h-0 select-none flex-col overflow-hidden rounded-b-lg shadow-md transition-all duration-300 peer-checked:max-h-56 peer-checked:py-3">
              <li className="cursor-pointer px-3 py-2 text-sm text-slate-600 hover:bg-blue-700 hover:text-white">
                Accounts
              </li>
              <li className="cursor-pointer px-3 py-2 text-sm text-slate-600 hover:bg-blue-700 hover:text-white">
                Team
              </li>
              <li className="cursor-pointer px-3 py-2 text-sm text-slate-600 hover:bg-blue-700 hover:text-white">
                Others
              </li>
            </ul>
          </div>

          <div className="col-span-2 hidden sm:block">
            <ul>
              <li className="mt-5 cursor-pointer border-l-2 border-transparent px-2 py-2 font-semibold transition hover:border-l-blue-700 hover:text-blue-700">
                Server
              </li>
            </ul>
          </div>

          <div className="col-span-8 overflow-hidden rounded-xl sm:bg-gray-50 sm:px-8 sm:shadow">
            <div className="pt-4">
              <h1 className="py-2 text-2xl font-semibold">Server settings</h1>
            </div>
            <hr className="mt-4 mb-8" />
            <form method="post" onSubmit={saveSetting}>
              <div className="flex items-center">
                <div className="flex flex-col space-y-2 sm:space-y-2">
                  <label htmlFor="port">
                    <span className="text-sm text-gray-500">PORT</span>
                    <div className="relative flex overflow-hidden rounded-md border-2 transition focus-within:border-blue-600">
                      <input
                        type="text"
                        id="PORT"
                        className="w-full flex-shrink appearance-none border-gray-300 bg-white py-2 px-4 text-base text-gray-700 placeholder-gray-400 focus:outline-none"
                        placeholder="3000"
                        value={serverSetting.PORT}
                        onChange={handleChange}
                      />
                    </div>
                  </label>
                  <label htmlFor="gauzy-api-server-url">
                    <span className="text-sm text-gray-500">
                      GAUZY API SERVER URL
                    </span>
                    <div className="relative flex overflow-hidden rounded-md border-2 transition focus-within:border-blue-600">
                      <input
                        type="text"
                        id="GAUZY_API_SERVER_URL"
                        className="w-full flex-shrink appearance-none border-gray-300 bg-white py-2 px-4 text-base text-gray-700 placeholder-gray-400 focus:outline-none"
                        placeholder="http://localhost:3000"
                        value={serverSetting.GAUZY_API_SERVER_URL}
                      />
                    </div>
                  </label>
                  <label htmlFor="public-gauzy-api-url">
                    <span className="text-sm text-gray-500">
                      PUBLIC GAUZY API SERVER URL
                    </span>
                    <div className="relative flex overflow-hidden rounded-md border-2 transition focus-within:border-blue-600">
                      <input
                        type="text"
                        id="NEXT_PUBLIC_GAUZY_API_SERVER_URL"
                        className="w-full flex-shrink appearance-none border-gray-300 bg-white py-2 px-4 text-base text-gray-700 placeholder-gray-400 focus:outline-none"
                        placeholder="http://localhost:3000"
                        value={serverSetting.NEXT_PUBLIC_GAUZY_API_SERVER_URL}
                      />
                    </div>
                  </label>
                </div>
              </div>
              <button
                className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white"
                type="submit"
              >
                Save Setting
              </button>
            </form>
            <hr className="mt-4 mb-8" />
          </div>
        </div>
      </div>
    </>
  );
}
