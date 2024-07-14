import { useState, useEffect } from 'react';
import { ServerPageTypeMessage } from '../../main/helpers/constant';
import { IPC_TYPES, LOG_TYPES } from '../../main/helpers/constant';
import { EverTeamsLogo } from '../components/svgs';
import { useTranslation } from 'react-i18next';

export function ServerPage() {
  const [isRun, setIsRun] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const { t } = useTranslation();

  useEffect(() => {
    window.electron.ipcRenderer.removeEventListener(IPC_TYPES.SERVER_PAGE);
    window.electron.ipcRenderer.on(IPC_TYPES.SERVER_PAGE, (arg: any) => {
      switch (arg.type) {
        case LOG_TYPES.SERVER_LOG:
          setLogs((prev) => [...prev, arg.msg]);
          break;
        case ServerPageTypeMessage.SERVER_STATUS:
          if (arg.data.isRun) {
            setIsRun(true);
          } else {
            setIsRun(false);
          }
          setLoading(false);
          break;
        default:
          break;
      }
    });
  }, []);

  const runServer = () => {
    setLoading(true);
    window.electron.ipcRenderer.sendMessage(IPC_TYPES.SERVER_PAGE, {
      type: ServerPageTypeMessage.SERVER_EXEC,
      data: {
        isRun: !isRun,
      },
    });
  };

  return (
    <div className="min-h-screen flex flex-col flex-auto flex-shrink-0 antialiased bg-white text-gray-800">
      <div className="rounded-lg px-16 py-14">
        <div className="flex justify-center">
          <EverTeamsLogo />
        </div>
      </div>
      <button
        className="block rounded-full border-4 border-transparent bg-blue-400 px-6 py-2 text-center text-base font-medium text-blue-100 outline-8 hover:outline hover:duration-300 w-fit mx-auto"
        onClick={runServer}
        disabled={loading}
      >
        {isRun ? t('FORM.BUTTON.STOP') : t('FORM.BUTTON.START')}
      </button>
      <div className="grid divide-y divide-neutral-200 shadow-lg mx-auto w-10/12">
        <div className="py-5 px-5">
          <details className="group">
            <summary className="flex justify-between items-center font-medium cursor-pointer list-none">
              <span> Server Logs</span>
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
                minHeight: '400px',
                maxHeight: '400px',
                overflowY: 'auto',
              }}
            >
              <div className="ml-1 mt-1">
                {logs.length &&
                  logs.map((log, i) => (
                    <div className="py-1" key={i}>
                      <span>{log}</span>
                    </div>
                  ))}
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
