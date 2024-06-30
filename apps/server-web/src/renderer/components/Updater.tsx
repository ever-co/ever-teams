import { EverTeamsLogo } from './svgs';
import { useTranslation } from 'react-i18next';
import * as Switch from '@radix-ui/react-switch';
import { SelectComponent } from './Select';
import { useState } from 'react';

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
type PropsProgress = {
  updateStates: UpdaterStates;
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
      label: `30 ${t('FORM.LABELS.MINUTES')}`,
    },
    {
      value: '60',
      label: `A ${t('FORM.LABELS.HOURS')}`,
    },
    {
      value: '180',
      label: `3 ${t('FORM.LABELS.HOURS')}`,
    },
    {
      value: '1140',
      label: `A ${t('FORM.LABELS.DAY')}`,
    },
  ]);
  return (
    <>
      <div className="relative overflow-y-auto overflow-x-hidden flex-grow left-8 w-11/12 min-h-screen">
        <div>
          <span className="font-bold text-lg">Update</span>
        </div>
        <div>
          <span className="font-bold text-base text-gray-500">
            Automatic Update Check
          </span>
        </div>
        <div className="mt-2">
          <span className="font-normal f-4 text-gray-500">
            Enable automatice update check, in order to run a request to check
            if new version is available and notify
          </span>
        </div>
        <div className="bg-gray-50 px-16 py-14 mt-10 w-full">
          <form>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Switch.Root className="SwitchRoot" id="airplane-mode">
                <Switch.Thumb className="SwitchThumb" />
              </Switch.Root>
              <label
                className="Label"
                htmlFor="airplane-mode"
                style={{ paddingLeft: 15 }}
              >
                Automatic Update
              </label>
            </div>
            <div>
              <SelectComponent
                title={t('FORM.FIELD.OPTIONS')}
                items={rangeUpdate}
              />
            </div>
          </form>
        </div>
        <div className="bg-gray-50 px-16 py-14 mt-10 w-full">
          <div className="flex justify-center">
            <EverTeamsLogo />
          </div>
          <p className="w-[230px] text-center font-normal text-gray-600"></p>
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
      </div>
      {props.Popup}
    </>
  );
};
