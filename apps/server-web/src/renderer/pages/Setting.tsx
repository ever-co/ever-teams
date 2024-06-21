import { useState, useEffect } from 'react';
import { SettingPageTypeMessage } from '../../main/helpers/constant';
import {
  SideBar,
  Popup,
  ServerComponent,
  UpdaterComponent,
  AboutComponent,
} from '../components';

interface SideMenu {
  displayName: string;
  key: string;
  isActive: boolean;
}

interface UpdaterStates {
  state:
    | 'check-update'
    | 'update-available'
    | 'downloading'
    | 'downloaded'
    | 'error'
    | 'not-started'
    | 'up-to-date';
  data: any;
  label:
    | 'CHECKING'
    | 'DOWNLOADING'
    | 'QUIT_N_INSTALL'
    | 'UP_TO_DATE'
    | 'UPDATE_AVAILABLE'
    | 'CHECK_FOR_UPDATE';
}

interface IServerSetting {
  PORT: number;
  GAUZY_API_SERVER_URL: string;
  NEXT_PUBLIC_GAUZY_API_SERVER_URL: string;
}

interface IPopup {
  type: 'success' | 'error' | 'none';
  isShow: boolean;
}

export function Setting() {
  const [menus, setMenu] = useState<SideMenu[]>([
    {
      displayName: 'SERVER',
      key: 'server',
      isActive: true,
    },
    {
      displayName: 'UPDATER',
      key: 'updater',
      isActive: false,
    },
    {
      displayName: 'ABOUT',
      key: 'about',
      isActive: false,
    },
  ]);

  const [updateStates, setUpdateState] = useState<UpdaterStates>({
    state: 'not-started',
    data: null,
    label: 'CHECK_FOR_UPDATE',
  });

  const [loading, setLoading] = useState<boolean>(false);

  const [popupServer, setPopupServer] = useState<IPopup>({
    isShow: false,
    type: 'none',
  });

  const [popupUpdater, setPopupUpdater] = useState<IPopup>({
    isShow: false,
    type: 'none',
  });

  const [version, setVersion] = useState<string>('0.1.0');

  const menuChange = (key: string) => {
    let newMenu = [...menus];
    newMenu = newMenu.map((menu) => {
      if (menu.key === key) {
        menu.isActive = true;
      } else {
        menu.isActive = false;
      }
      return menu;
    });
    setMenu(newMenu);
  };

  const sendingMessageToMain = (data: any, type: string) => {
    window.electron.ipcRenderer.sendMessage('setting-page', {
      type,
      data: data,
    });
  };

  const [serverSetting, setServerSetting] = useState<IServerSetting>({
    PORT: 3002,
    GAUZY_API_SERVER_URL: '',
    NEXT_PUBLIC_GAUZY_API_SERVER_URL: '',
  });

  const checkForUpdate = () => {
    if (updateStates.state === 'downloaded') {
      sendingMessageToMain({}, SettingPageTypeMessage.installUpdate);
    } else {
      sendingMessageToMain({}, SettingPageTypeMessage.checkUpdate);
    }
    setLoading(true);
  };

  const activeMenu = (): string => {
    const selectedMenu = menus.find((menu) => menu.isActive);
    return selectedMenu?.key || 'server';
  };

  const saveSetting = (data: IServerSetting) => {
    setServerSetting(data);
    sendingMessageToMain(data, SettingPageTypeMessage.saveSetting);
  };

  const setPopupServerState = () => {
    setPopupServer((prevData) => ({ ...prevData, isShow: !prevData.isShow }));
  };

  const setPopupUpdaterState = () => {
    setPopupUpdater((prevData) => ({ ...prevData, isShow: !prevData.isShow }));
  };

  const MenuComponent = () => {
    if (activeMenu() === 'server') {
      return (
        <ServerComponent
          serverSetting={serverSetting}
          saveSetting={saveSetting}
          Popup={
            <Popup
              isShowPopup={popupServer.isShow}
              modalAction={setPopupServerState}
              type={popupServer.type}
              message=""
            />
          }
        />
      );
    }

    if (activeMenu() === 'updater') {
      return (
        <UpdaterComponent
          checkForUpdate={checkForUpdate}
          loading={loading}
          updateStates={updateStates}
          Popup={
            <Popup
              isShowPopup={popupUpdater.isShow}
              modalAction={setPopupUpdaterState}
              type={popupUpdater.type}
              message={updateStates.data}
            />
          }
        />
      );
    }

    if (activeMenu() === 'about') {
      sendingMessageToMain({}, SettingPageTypeMessage.showVersion);
      return <AboutComponent version={version} />;
    }
    return <AboutComponent version={version} />;
  };

  useEffect(() => {
    window.electron.ipcRenderer.on('setting-page', (arg: any) => {
      switch (arg.type) {
        case SettingPageTypeMessage.updateAvailable:
          setUpdateState({
            state: 'update-available',
            data: null,
            label: 'UPDATE_AVAILABLE',
          });
          break;
        case SettingPageTypeMessage.downloadingUpdate:
          setUpdateState({
            state: 'downloading',
            data: arg.data.percent,
            label: 'DOWNLOADING',
          });
          break;
        case SettingPageTypeMessage.downloaded:
          setUpdateState({
            state: 'downloaded',
            data: null,
            label: 'QUIT_N_INSTALL',
          });
          setLoading(false);
          break;
        case SettingPageTypeMessage.updateError:
          setUpdateState({
            state: 'error',
            data: arg.data.message,
            label: 'CHECK_FOR_UPDATE',
          });
          setLoading(false);
          setPopupUpdater({
            isShow: true,
            type: 'error',
          });
          break;
        case SettingPageTypeMessage.upToDate:
          setUpdateState({
            state: 'up-to-date',
            data: null,
            label: 'UP_TO_DATE',
          });
          setLoading(false);
          break;
        case SettingPageTypeMessage.loadSetting:
          console.log('server setting', serverSetting);
          setServerSetting({
            PORT: arg.data.PORT,
            GAUZY_API_SERVER_URL: arg.data.GAUZY_API_SERVER_URL,
            NEXT_PUBLIC_GAUZY_API_SERVER_URL:
              arg.data.NEXT_PUBLIC_GAUZY_API_SERVER_URL,
          });
          break;
        case SettingPageTypeMessage.mainResponse:
          setPopupServer({
            isShow: true,
            type: arg.data ? 'success' : 'error',
          });
          break;
        case SettingPageTypeMessage.showVersion:
          setVersion(arg.data);
          break;
        case SettingPageTypeMessage.selectMenu:
          menuChange(arg.data.key);
          break;
        default:
          break;
      }
    });
  }, []);

  return (
    <SideBar menus={menus} menuChange={menuChange}>
      <MenuComponent />
    </SideBar>
  );
}
