import { useState, useEffect } from 'react';
import { SettingPageTypeMessage } from '../../main/helpers/constant';
import {
  SideBar,
  Popup,
  ServerComponent,
  UpdaterComponent,
  AboutComponent,
  GeneralComponent,
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

interface Languages {
  code: string;
  label: string;
}

type UpdateSetting = {
  autoUpdate: boolean;
  updateCheckPeriode: string;
};

export function Setting() {
  const [menus, setMenu] = useState<SideMenu[]>([
    {
      displayName: 'UPDATER',
      key: 'updater',
      isActive: true,
    },
    {
      displayName: 'SERVER',
      key: 'server',
      isActive: false,
    },
    {
      displayName: 'ABOUT',
      key: 'about',
      isActive: false,
    },
  ]);

  const [updateSetting, setUpdateSetting] = useState<UpdateSetting>({
    autoUpdate: false,
    updateCheckPeriode: '180',
  });

  const [langs, setLangs] = useState<Languages[]>([
    {
      code: 'en',
      label: 'English',
    },
    {
      code: 'bg',
      label: 'Bulgarian',
    },
  ]);

  const [lng, setLng] = useState<string>('en');

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

  const changeLanguage = (lang: Languages) => {
    sendingMessageToMain(lang.code, SettingPageTypeMessage.langChange);
    setLng(lang.code);
  };

  const saveSettingUpdate = (data: UpdateSetting) => {
    sendingMessageToMain(data, SettingPageTypeMessage.updateSetting);
  };

  const sendingMessageToMain = (data: any, type: string) => {
    window.electron.ipcRenderer.sendMessage('setting-page', {
      type,
      data: data,
    });
  };

  const updateDataSettingUpdate = (data: UpdateSetting) => {
    setUpdateSetting(data);
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
          changeAutoUpdate={updateDataSettingUpdate}
          data={updateSetting}
          saveSettingUpdate={saveSettingUpdate}
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

    if (activeMenu() === 'general') {
      return (
        <GeneralComponent langs={langs} onChange={changeLanguage} lang={lng} />
      );
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
          console.log('server setting', arg);
          setServerSetting({
            PORT: arg.data.server.PORT,
            GAUZY_API_SERVER_URL: arg.data.server.GAUZY_API_SERVER_URL,
            NEXT_PUBLIC_GAUZY_API_SERVER_URL:
              arg.data.server.NEXT_PUBLIC_GAUZY_API_SERVER_URL,
          });
          setLng(arg.data.general.lang);
          setUpdateSetting({
            autoUpdate: arg.data.general.autoUpdate,
            updateCheckPeriode: arg.data.general.updateCheckPeriode,
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
    <SideBar
      menus={menus}
      menuChange={menuChange}
      langs={langs}
      lang={lng}
      onLangChange={changeLanguage}
    >
      <MenuComponent />
    </SideBar>
  );
}
