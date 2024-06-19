import { EverTeamsLogo } from './svgs';

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
    | 'Checking'
    | 'Downloading'
    | 'Quit and Install'
    | 'Up to date'
    | 'Update Available'
    | 'Check For Update'
    | 'Up to date';
}
type PropsProgress = {
  updateStates: UpdaterStates;
};
const ProgressComponent = (props: PropsProgress) => {
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
          `${props.updateStates.label} ${props.updateStates.data} %`}
        {props.updateStates.state !== 'downloading' && props.updateStates.label}
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
export const UpdaterComponent = (props: Props) => {
  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="rounded-lg bg-gray-50 px-16 py-14">
          <div className="flex justify-center">
            <EverTeamsLogo />
          </div>
          <p className="w-[230px] text-center font-normal text-gray-600"></p>
          <button
            className="mx-auto mt-10 block rounded-xl border-4 border-transparent bg-blue-400 px-6 py-3 text-center text-base font-medium text-blue-100 outline-8 hover:outline hover:duration-300"
            onClick={props.checkForUpdate}
            disabled={props.loading}
          >
            {props.loading && (
              <ProgressComponent updateStates={props.updateStates} />
            )}
            {!props.loading && props.updateStates.label}
          </button>
        </div>
      </div>
      {props.Popup}
    </>
  );
};
