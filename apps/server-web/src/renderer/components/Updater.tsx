import { useTranslation } from 'react-i18next';
import * as Switch from '@radix-ui/react-switch';
import { SelectComponent } from './Select';
import { useEffect, useState } from 'react';
import { ToastComponent } from './Toast';
import { SettingPageTypeMessage } from '../../main/helpers/constant';

interface UpdaterStates {
  state:
  | 'check-update'
  | 'update-available'
  | 'downloading'
  | 'downloaded'
  | 'error'
  | 'not-started'
  | 'up-to-date'
  | 'cancel'
  ;
  data: any;
  label:
  | 'CHECKING'
  | 'DOWNLOADING'
  | 'QUIT_N_INSTALL'
  | 'UP_TO_DATE'
  | 'UPDATE_AVAILABLE'
  | 'CHECK_FOR_UPDATE';
}
type PropsProgress = {
  updateStates: UpdaterStates;
};

type UpdateSetting = {
  autoUpdate: boolean;
  updateCheckPeriode: string;
};

const ProgressComponent = (props: PropsProgress) => {
  const { t } = useTranslation();
  return (
    <div className="flex">
      <div className="flex-none w-5">
        <svg
          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white m-auto"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </div>
      <div className="flex-1 w-auto">
        {props.updateStates.state === 'downloading' &&
          `${t(`FORM.LABELS.${props.updateStates.label}`)} ${props.updateStates.data} %`}
        {props.updateStates.state !== 'downloading' &&
          t(`FORM.LABELS.${props.updateStates.label}`)}
      </div>
    </div>
  );
};

type Props = {
  checkForUpdate: () => void;
  loading: boolean;
  updateStates: UpdaterStates;
  Popup: JSX.Element;
  data: UpdateSetting;
  changeAutoUpdate: (data: UpdateSetting) => void;
  saveSettingUpdate: (data: UpdateSetting) => void;
};

type RangeUpdates = {
  value: string;
  label: string;
};
export const UpdaterComponent = (props: Props) => {
  const { t } = useTranslation();
  const [rangeUpdate, setRangeUpdate] = useState<RangeUpdates[]>([
    {
      value: '30',
      label: `30_MINUTES`,
    },
    {
      value: '60',
      label: `A_HOURS`,
    },
    {
      value: '180',
      label: `3_HOURS`,
    },
    {
      value: '1140',
      label: `A_DAY`,
    },
  ]);

  const [toastShow, setToastShow] = useState<boolean>(false);

  const setOpen = () => {
    setToastShow(false);
    setTimeout(() => {
      setToastShow(true);
    }, 100);
  };

  const CloseToast = () => {
    setToastShow(false);
  };

  const onSelectPeriode = (value: string) => {
    props.changeAutoUpdate({
      autoUpdate: props.data.autoUpdate,
      updateCheckPeriode: value,
    });
    props.saveSettingUpdate({
      autoUpdate: props.data.autoUpdate,
      updateCheckPeriode: value,
    });
  };

  useEffect(() => {
    window.electron.ipcRenderer.once('setting-page', (arg: any) => {
      switch (arg.type) {
        case SettingPageTypeMessage.updateSettingResponse:
          setOpen();
          break;

        default:
          break;
      }
    });
  }, []);

  return (
    <>
      <div className="relative overflow-y-auto overflow-x-hidden flex-grow left-8 w-11/12 min-h-screen">
        <div>
          <span className="font-bold text-lg">{t('MENU.UPDATER')}</span>
        </div>
        <div>
          <span className="font-bold text-base text-gray-500">
            {t('FORM.LABELS.AUTO_UPDATE_TITLE')}
          </span>
        </div>
        <div className="mt-2">
          <span className="font-normal f-4 text-gray-500">
            {t('FORM.LABELS.AUTO_UPDATE_SUBTITLE')}
          </span>
        </div>
        <div className="bg-gray-50 px-16 py-14 mt-10 w-full">
          <form>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div className="flex w-1/2">
                <Switch.Root
                  className="SwitchRoot"
                  id="airplane-mode"
                  onCheckedChange={(value) => {
                    setOpen();
                    props.changeAutoUpdate({
                      autoUpdate: value,
                      updateCheckPeriode: props.data.updateCheckPeriode,
                    });
                    props.saveSettingUpdate({
                      autoUpdate: value,
                      updateCheckPeriode: props.data.updateCheckPeriode,
                    });
                  }}
                  checked={props.data.autoUpdate}
                >
                  <Switch.Thumb className="SwitchThumb" />
                </Switch.Root>
                <label
                  className="Label"
                  htmlFor="airplane-mode"
                  style={{ paddingLeft: 15 }}
                >
                  {t('FORM.LABELS.AUTO_UPDATE_TOGLE')}
                </label>
              </div>
              <div className="flex w-2/2">
                <SelectComponent
                  title={t('FORM.FIELDS.OPTIONS')}
                  items={rangeUpdate}
                  value={props.data.updateCheckPeriode}
                  defaultValue={props.data.updateCheckPeriode}
                  disabled={!props.data.autoUpdate}
                  onValueChange={onSelectPeriode}
                />
              </div>
            </div>
            <div></div>
          </form>
        </div>
        <div className="mt-8">
          <div>
            <span className="font-bold text-lg text-gray-500">
              {t('FORM.LABELS.CHECK_UPDATE_TITLE')}
            </span>
          </div>
          <div>
            <span className="text-base text-gray-500">
              {t('FORM.LABELS.CHECK_UPDATE_SUBTITLE')}
            </span>
          </div>
        </div>
        <button
          className="mt-10 block rounded-full border-4 border-transparent bg-blue-400 px-6 py-2 text-center text-base font-medium text-blue-100 outline-8 hover:outline hover:duration-300"
          onClick={props.checkForUpdate}
          disabled={props.loading}
        >
          {props.loading && (
            <ProgressComponent updateStates={props.updateStates} />
          )}
          {!props.loading && t(`FORM.LABELS.${props.updateStates.label}`)}
        </button>
      </div>
      {props.Popup}
      <ToastComponent
        show={toastShow}
        title="Info"
        message="Update Successfully"
        onClose={CloseToast}
        autoClose={true}
        timeout={1000}
      />
    </>
  );
};
