import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IServerSetting, IServerComponent } from '../../libs/interfaces';
import FolderOpenIcon from '@heroicons/react/20/solid/FolderOpenIcon';
import ShieldCheckIcon from '@heroicons/react/20/solid/ShieldCheckIcon';
import ServerIcon from '@heroicons/react/20/solid/ServerIcon';
import LinkIcon from '@heroicons/react/20/solid/LinkIcon';

export const ServerComponent = (props: IServerComponent) => {
  const { t } = useTranslation();
  const [serverSetting, setServerSetting] = useState<IServerSetting>(
    props.serverSetting,
  );

  const saveSetting = (e: any) => {
    e.preventDefault();
    props.saveSetting(serverSetting);
  };

  const handleChange = (event: any) => {
    const { id, value } = event.target;
    setServerSetting((prevData: any) => ({ ...prevData, [id]: value }));
  };

  const handleToggleSsl = () => {
    setServerSetting((prevData: any) => ({
      ...prevData,
      useSsl: !prevData.useSsl,
      sslKey: !prevData.useSsl ? prevData.sslKey : '',
      sslSecret: !prevData.useSsl ? prevData.sslSecret : '',
    }));
  };

  const browseFile = async (field: 'sslKey' | 'sslSecret') => {
    const result = await window.electron.ipcRenderer.invoke('open-file-dialog', {
      filters: [
        { name: 'PEM Files', extensions: ['pem', 'crt', 'key', 'cert'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    if (result && !result.canceled && result.filePaths.length > 0) {
      setServerSetting((prevData: any) => ({ ...prevData, [field]: result.filePaths[0] }));
    }
  };

  const inputClass =
    'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 py-2 px-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:border-transparent transition-[border-color,box-shadow] duration-150';

  const labelClass =
    'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1';

  const sectionHeadingClass =
    'flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3';

  const sectionCardClass =
    'rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/40 p-4 mb-3';

  return (
    <>
      <div className="relative h-screen flex flex-col flex-grow overflow-hidden w-11/12 ml-8">
        <form
          method="post"
          onSubmit={saveSetting}
          className="flex flex-col flex-1 min-h-0 overflow-hidden"
        >
          <div className="flex-1 min-h-0 overflow-hidden px-4 py-4">

            {/* Section: Server Address */}
            <div className={sectionCardClass}>
              <p className={sectionHeadingClass}>
                <ServerIcon className="h-3.5 w-3.5" aria-hidden="true" />
                Server Address
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
                API Configuration
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
                Security
              </p>

              {/* SSL Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 leading-none">
                    {t('FORM.FIELDS.USE_SSL')}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    Serve the app over HTTPS using your own certificates
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

              {/* SSL key + cert side-by-side */}
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
                        aria-label={`${t('FORM.FIELDS.BROWSE')} SSL key file`}
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
                        aria-label={`${t('FORM.FIELDS.BROWSE')} SSL certificate file`}
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

          {/* Footer */}
          <div className="shrink-0 fixed bottom-0 flex justify-end px-4 py-3 border-gray-200 dark:border-gray-700">
            <button
              type="submit"
              className="flex items-center gap-2 rounded-full bg-purple-600 px-5 py-2 text-sm font-medium text-white hover:bg-purple-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 transition-colors duration-150"
            >
              {t('FORM.BUTTON.SAVE_SETTING')}
            </button>
          </div>
        </form>
      </div>
      {props.Popup}
    </>
  );
};
