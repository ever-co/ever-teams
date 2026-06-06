import { useTranslation } from 'react-i18next';
import { IServerSetting } from '../../libs/interfaces';
import { useState } from 'react';
import { SettingPageTypeMessage } from '../../libs/constant';
import { config } from '../../../configs/config';
import { get } from '../../libs/utils/api';
import { ToastComponent } from '../../components/Toast';
import { useServerSetting } from '../../hooks/useServerSetting';
import { serverFormStyles } from '../../libs/utils/server-form-styles';
import CheckBadgeIcon from '@heroicons/react/20/solid/CheckBadgeIcon';
import ArrowUturnUpIcon from '@heroicons/react/20/solid/ArrowUturnUpIcon';
import ArrowLeftIcon from '@heroicons/react/20/solid/ArrowLeftIcon';
import FolderOpenIcon from '@heroicons/react/20/solid/FolderOpenIcon';
import ShieldCheckIcon from '@heroicons/react/20/solid/ShieldCheckIcon';
import ServerIcon from '@heroicons/react/20/solid/ServerIcon';
import LinkIcon from '@heroicons/react/20/solid/LinkIcon';

type Props = {
  back: () => void;
};

const AdvancedSetting = (props: Props) => {
  const { t } = useTranslation();
  const initialSetting: IServerSetting = {
    PORT: Number(config.DESKTOP_WEB_SERVER_APP_DEFAULT_PORT || 3001),
    GAUZY_API_SERVER_URL:
      config.GAUZY_API_SERVER_URL || 'http://localhost:3000',
    NEXT_PUBLIC_GAUZY_API_SERVER_URL:
      config.NEXT_PUBLIC_GAUZY_API_SERVER_URL || 'http://localhost:3000',
    DESKTOP_WEB_SERVER_HOSTNAME:
      config.DESKTOP_WEB_SERVER_HOSTNAME || '127.0.0.1',
    useSsl: false,
    sslKey: '',
    sslSecret: '',
  };
  const { serverSetting, handleChange, handleToggleSsl, browseFile } = useServerSetting(initialSetting);

  const [errorConnection, setErrorConnection] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [toastShow, setToastShow] = useState<boolean>(false);

  const { input: inputClass, label: labelClass, sectionHeading: sectionHeadingClass, sectionCard: sectionCardClass } = serverFormStyles;

  const saveSetting = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    window.electron.ipcRenderer.sendMessage('setting-page', {
      data: serverSetting,
      type: SettingPageTypeMessage.saveSetting,
      isSetup: true,
    });
  };

  const checkConnection = async () => {
    try {
      setLoading(true);
      await get(serverSetting.GAUZY_API_SERVER_URL, '/api');
      setLoading(false);
      setErrorConnection(false);
      setToastShow(true);
    } catch (error) {
      console.log(error);
      setErrorConnection(true);
      setToastShow(true);
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <div className="shrink-0 text-center pt-5 pb-3 px-6">
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-0.5">
            {t('FORM.LABELS.SETUP_TITLE')}
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('FORM.LABELS.SETUP_SUBTITLE')}
          </p>
        </div>

        {/* Form — flex-col fills remaining height, no scrolling */}
        <form
          method="post"
          onSubmit={saveSetting}
          className="flex flex-col min-h-0 overflow-hidden"
        >
          <div className="flex-1 min-h-0 overflow-hidden px-8 py-2">

            {/* Section: Server Address */}
            <div className={sectionCardClass}>
              <p className={sectionHeadingClass}>
                <ServerIcon className="h-3.5 w-3.5" aria-hidden="true" />
                {t('FORM.SECTIONS.SERVER_ADDRESS')}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass} htmlFor="DESKTOP_WEB_SERVER_HOSTNAME">
                    {t('FORM.FIELDS.HOST')}
                  </label>
                  <input
                    className={inputClass}
                    id="DESKTOP_WEB_SERVER_HOSTNAME"
                    name="DESKTOP_WEB_SERVER_HOSTNAME"
                    type="text"
                    placeholder="127.0.0.1…"
                    autoComplete="off"
                    spellCheck={false}
                    value={serverSetting.DESKTOP_WEB_SERVER_HOSTNAME || ''}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="PORT">
                    {t('FORM.FIELDS.PORT')}
                  </label>
                  <input
                    className={inputClass}
                    id="PORT"
                    name="PORT"
                    type="text"
                    inputMode="numeric"
                    placeholder="3001…"
                    autoComplete="off"
                    value={serverSetting.PORT}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Section: API Configuration */}
            <div className={sectionCardClass}>
              <p className={sectionHeadingClass}>
                <LinkIcon className="h-3.5 w-3.5" aria-hidden="true" />
                {t('FORM.SECTIONS.API_CONFIGURATION')}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass} htmlFor="GAUZY_API_SERVER_URL">
                    {t('FORM.FIELDS.GAUZY_API_SERVER_URL')}
                  </label>
                  <input
                    className={inputClass}
                    id="GAUZY_API_SERVER_URL"
                    name="GAUZY_API_SERVER_URL"
                    type="url"
                    placeholder="http://localhost:3000…"
                    autoComplete="off"
                    spellCheck={false}
                    value={serverSetting.GAUZY_API_SERVER_URL}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="NEXT_PUBLIC_GAUZY_API_SERVER_URL">
                    {t('FORM.FIELDS.NEXT_PUBLIC_GAUZY_API_SERVER_URL')}
                  </label>
                  <input
                    className={inputClass}
                    id="NEXT_PUBLIC_GAUZY_API_SERVER_URL"
                    name="NEXT_PUBLIC_GAUZY_API_SERVER_URL"
                    type="url"
                    placeholder="http://localhost:3000…"
                    autoComplete="off"
                    spellCheck={false}
                    value={serverSetting.NEXT_PUBLIC_GAUZY_API_SERVER_URL}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Section: Security / SSL */}
            <div className={sectionCardClass}>
              <p className={sectionHeadingClass}>
                <ShieldCheckIcon className="h-3.5 w-3.5" aria-hidden="true" />
                {t('FORM.SECTIONS.SECURITY')}
              </p>

              {/* SSL Toggle row */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 leading-none">
                    {t('FORM.FIELDS.USE_SSL')}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {t('FORM.DESCRIPTIONS.SSL')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleSsl}
                  aria-label={t('FORM.FIELDS.USE_SSL')}
                  aria-checked={serverSetting.useSsl}
                  role="switch"
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-[background-color] duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-800 ${
                    serverSetting.useSsl
                      ? 'bg-purple-600'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      serverSetting.useSsl ? 'translate-x-[18px]' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* SSL key + cert side-by-side — no extra height when both visible */}
              {serverSetting.useSsl && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass} htmlFor="sslKey">
                      {t('FORM.FIELDS.SSL_KEY_FILE')}
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        className={`${inputClass} flex-1 min-w-0`}
                        id="sslKey"
                        name="sslKey"
                        type="text"
                        placeholder="/path/to/server.key…"
                        autoComplete="off"
                        spellCheck={false}
                        value={serverSetting.sslKey || ''}
                        onChange={handleChange}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => browseFile('sslKey')}
                        aria-label={t('FORM.ARIA.BROWSE_SSL_KEY')}
                        className="flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 transition-colors duration-150 shrink-0"
                      >
                        <FolderOpenIcon className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('FORM.FIELDS.BROWSE')}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="sslSecret">
                      {t('FORM.FIELDS.SSL_CERT_FILE')}
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        className={`${inputClass} flex-1 min-w-0`}
                        id="sslSecret"
                        name="sslSecret"
                        type="text"
                        placeholder="/path/to/server.crt…"
                        autoComplete="off"
                        spellCheck={false}
                        value={serverSetting.sslSecret || ''}
                        onChange={handleChange}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => browseFile('sslSecret')}
                        aria-label={t('FORM.ARIA.BROWSE_SSL_CERT')}
                        className="flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 transition-colors duration-150 shrink-0"
                      >
                        <FolderOpenIcon className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('FORM.FIELDS.BROWSE')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer action bar */}
          <div className="fixed bottom-0 w-full shrink-0 flex items-center justify-between px-8 py-3 border-gray-200 dark:border-gray-700 backdrop-blur-sm">
            <button
              type="button"
              onClick={props.back}
              className="flex items-center gap-2 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 transition-colors duration-150"
            >
              <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
              {t('FORM.BUTTON.BACK')}
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={checkConnection}
                disabled={loading}
                className="flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 transition-colors duration-150"
              >
                {loading ? (
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" aria-hidden="true" />
                ) : (
                  <CheckBadgeIcon className="h-4 w-4" aria-hidden="true" />
                )}
                {t('FORM.BUTTON.CHECK_CONNECTIVITY')}
              </button>

              <button
                name="save_setting"
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 rounded-full bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 transition-colors duration-150"
              >
                {loading ? (
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" aria-hidden="true" />
                ) : (
                  <ArrowUturnUpIcon className="h-4 w-4" aria-hidden="true" />
                )}
                {t('FORM.BUTTON.CONTINUE')}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="absolute top-4 right-4" aria-live="polite">
        <ToastComponent
          show={toastShow}
          title="MESSAGE.INFO"
          message={
            errorConnection
              ? 'MESSAGE.CONNECTION_ERROR'
              : 'MESSAGE.CONNECTION_SUCCESS'
          }
          onClose={() => setToastShow(false)}
          autoClose={true}
          timeout={2000}
          type={errorConnection ? 'error' : 'success'}
        />
      </div>
    </>
  );
};

export default AdvancedSetting;
