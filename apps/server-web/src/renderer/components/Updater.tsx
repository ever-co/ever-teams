import { useTranslation } from 'react-i18next';
import * as Switch from '@radix-ui/react-switch';
import { SelectComponent } from './Select';
import { useEffect, useState } from 'react';
import { ToastComponent } from './Toast';
import { SettingPageTypeMessage } from '../../main/helpers/constant';
import { DefaultRangeUpdateTimes } from '../libs/constant';
import { IPC_TYPES, LOG_TYPES } from '../../main/helpers/constant';
import {
  IProgressComponent,
  IRangeUpdates,
  IUpdaterComponent,
} from '../libs/interfaces';

const ProgressComponent = (props: IProgressComponent) => {
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

export const UpdaterComponent = (props: IUpdaterComponent) => {
  const { t } = useTranslation();
  const [rangeUpdate, _] = useState<IRangeUpdates[]>(DefaultRangeUpdateTimes);

  const [updateLogs, setUpdateLogs] = useState<string[]>([]);

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

  const updaterEvent = (arg: any) => {
    switch (arg.type) {
      case SettingPageTypeMessage.updateSettingResponse:
        setOpen();
        break;
      case LOG_TYPES.UPDATE_LOG:
        setUpdateLogs((prev) => [...prev, arg.msg]);
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    window.electron.ipcRenderer.removeEventListener(IPC_TYPES.UPDATER_PAGE);
    window.electron.ipcRenderer.on(IPC_TYPES.UPDATER_PAGE, updaterEvent);
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
                  className="switch-root"
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
                  <Switch.Thumb className="switch-thumb" />
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
                  items={rangeUpdate.map((i) => ({
                    ...i,
                    label: `FORM.LABELS.UPDATE_OPTIONS.${i.label}`,
                  }))}
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
        <div className="grid divide-y divide-neutral-200 shadow-lg mx-auto mt-8">
          <div className="py-5 px-5">
            <details className="group">
              <summary className="flex justify-between items-center font-medium cursor-pointer list-none">
                <span> Update Logs</span>
                <span className="transition group-open:rotate-180">
                  <svg
                    fill="none"
                    height="24"
                    shapeRendering="geometricPrecision"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    viewBox="0 0 24 24"
                    width="24"
                  >
                    <path d="M6 9l6 6 6-6"></path>
                  </svg>
                </span>
              </summary>
              <div
                className="inline-block w-full bg-black text-white text-xs leading-3"
                style={{
                  minHeight: '150px',
                  maxHeight: '150px',
                  overflowY: 'auto',
                }}
              >
                <div className="ml-1 mt-1">
                  {updateLogs.length > 0 &&
                    updateLogs.map((ulog, i) => (
                      <div className="py-1" key={i}>
                        <span>{ulog}</span>
                      </div>
                    ))}
                </div>
              </div>
            </details>
          </div>
        </div>
      </div>
      {props.Popup}
      <ToastComponent
        show={toastShow}
        title="MESSAGE.INFO"
        message="MESSAGE.UPDATE_SUCCESS"
        onClose={CloseToast}
        autoClose={true}
        timeout={1000}
      />
    </>
  );
};
