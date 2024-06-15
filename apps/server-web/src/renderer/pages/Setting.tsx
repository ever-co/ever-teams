import { useState, useEffect } from 'react';
import { SideBar } from '../components/SideBar';

interface SideMenu {
  displayName: string;
  key: string;
  isActive: boolean;
}

export function Setting() {
  const [menus, setMenu] = useState<SideMenu[]>([
    {
      displayName: 'Server',
      key: 'server',
      isActive: true
    },
    {
      displayName: 'Updater',
      key: 'updater',
      isActive: false
    },
    {
      displayName: 'About',
      key: 'about',
      isActive: false
    }
  ]);

  const menuChange = (key: string) => {
    let newMenu = [...menus];
    newMenu = newMenu.map((menu) => {
      if (menu.key === key) {
        menu.isActive = true;
      } else {
        menu.isActive = false;
      }
      return menu;
    })
    setMenu(newMenu);
  }

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

  const checkForUpdate = () => {
    window.electron.ipcRenderer.sendMessage('check_for_update');
  }

  const handleChange = (event:any) => {
    const { id, value } = event.target;
    console.log('name', id);
    console.log('value', value);
    setServerSetting((prevData) => ({ ...prevData, [id]: value }));
  };

  const activeMenu = (): string => {
    const selectedMenu = menus.find((menu) => menu.isActive);
    return selectedMenu?.key || 'server';
  }

  const ServerComponent = () => {
    return (
      <div className="relative overflow-y-auto overflow-x-hidden flex-grow left-16 top-16 w-3/4">
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
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-400"
            type="submit"
          >
            Save Setting
          </button>
        </form>
      </div>
    )
  }

  const UpdaterComponent = () => {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="rounded-lg bg-gray-50 px-16 py-14">
          <div className="flex justify-center">
            <div className="rounded-full bg-green-200 p-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500 p-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="h-8 w-8 text-white">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
            </div>
          </div>
          <h3 className="my-4 text-center text-3xl font-semibold text-gray-700">Ever Teams</h3>
          <p className="w-[230px] text-center font-normal text-gray-600"></p>
          <button
            className="mx-auto mt-10 block rounded-xl border-4 border-transparent bg-blue-400 px-6 py-3 text-center text-base font-medium text-blue-100 outline-8 hover:outline hover:duration-300"
            onClick={checkForUpdate}
          >Check For Update</button>
        </div>
      </div>
    )
  }


  const AboutComponent = () => {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="rounded-lg bg-gray-50 px-16 py-14">
          <div className="flex justify-center">
            <div className="rounded-full bg-green-200 p-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500 p-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="h-8 w-8 text-white">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
            </div>
          </div>
          <h3 className="my-4 text-center text-3xl font-semibold text-gray-700">Ever Teams</h3>
          <p className="w-[230px] text-center font-normal text-gray-600">V 1.0.0</p>
        </div>
      </div>
    )
  }


  const MenuComponent = () => {
    if (activeMenu() === 'server') {
        return (<ServerComponent />)
    }

    if (activeMenu() === 'updater') {
      return (<UpdaterComponent />)
    }
    return (<AboutComponent />)
  }

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
    <SideBar
      menus={menus}
      menuChange={menuChange}
    >
      <MenuComponent />
    </SideBar>
  );
}
function newFunction(activeMenu: () => string) {
  return activeMenu() === 'server';
}
