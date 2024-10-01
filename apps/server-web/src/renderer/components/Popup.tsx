import { useTranslation } from 'react-i18next';
import { IPopupComponent } from '../libs/interfaces';

export function Popup(props: IPopupComponent) {
  const { t } = useTranslation();
  return (
    <div
      className={`fixed z-10 inset-0 overflow-y-auto ${props.isShowPopup ? '' : 'hidden'}`}
      id="my-modal"
    >
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
        <span
          className="hidden sm:inline-block sm:align-middle sm:h-screen"
          aria-hidden="true"
        >
          &#8203;
        </span>
        <div
          className="inline-block align-bottom bg-white dark:bg-[#25272D] dark:text-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-1/3"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-headline"
        >
          <div>
            <div className="mx-auto flex items-center justify-center h-32 w-12 rounded-full">
              {props.type === 'success' && (
                <div className="rounded-full bg-green-200 p-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500 p-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                      className="h-8 w-8 text-white"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                  </div>
                </div>
              )}
              {props.type === 'warning' && (
                <div className="rounded-full bg-orange-200 p-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-500 p-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                      className="h-8 w-8 text-white"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                  </div>
                </div>
              )}
              {props.type === 'error' && (
                <div className="rounded-full bg-red-200 p-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 p-4">
                    <svg
                      className="h-8 w-8 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-3 text-center sm:mt-5">
              <h3
                className="text-lg leading-6 font-medium text-gray-900 dark:text-white"
                id="modal-headline"
              >
                {props.type == 'success' || 'warning'
                  ? t('MESSAGE.SUCCESS')
                  : t('MESSAGE.ERROR')}
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500 text-pretty break-words">
                  {props.message}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-row mt-5 sm:mt-6">
            <button
              className="mx-auto mt-10 block rounded-lg border-4 border-transparent bg-blue-400 px-6 py-3 text-center text-base font-medium text-blue-100 outline-8"
              onClick={props.modalAction}
            >
              {t('FORM.BUTTON.OK')}
            </button>
            {props.closeAction && (
              <button
                className="mx-auto mt-10 block rounded-xl border-4 border-transparent bg-red-400 px-6 py-3 text-center text-base font-medium text-red-100 outline-8 hover:outline hover:duration-300"
                onClick={props.closeAction}
              >
                {t('FORM.BUTTON.CLOSE')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
