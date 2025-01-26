import { useState, useEffect, useRef, ReactNode } from 'react';
import { ServerPageTypeMessage, WindowTypes } from '../../main/helpers/constant';
import { IPC_TYPES, LOG_TYPES } from '../../main/helpers/constant';
import { EverTeamsLogo } from '../components/svgs';
import { useTranslation } from 'react-i18next';
import WindowControl from '../components/window-control';
import Container from '../components/container';
import { CUSTOM_STYLE } from '../libs/constant';
import { IDevices } from '../../main/helpers/interfaces';

const LogView = ({ children }: { children: ReactNode }) => {
  return <div className="py-1">{children}</div>;
};

export function ServerPage() {
  const [customStyle, setCustomStyle] = useState(CUSTOM_STYLE.WINDOWS);
  const [ platform, setPlatform ] = useState<IDevices>('win32');
  const logRef = useRef<HTMLDivElement>(null);
  const [isRun, setIsRun] = useState<boolean>(false);
  const [logs, setLogs] = useState<
    {
      message: string;
      type: 'error-log' | 'log';
    }[]
  >([]);
  const [loading, setLoading] = useState<boolean>(false);
  const { t } = useTranslation();
  const [logOpen, setLogOpen] = useState<boolean>(false);

  const getCustomStyle = async () => {
    const platform = await window.electron.ipcRenderer.invoke('get-platform');
    setPlatform(platform);
    if (platform === 'darwin') {
      setCustomStyle(CUSTOM_STYLE.MAC);
    } else {
      setCustomStyle(CUSTOM_STYLE.WINDOWS); // windows or linux
    }
  }

  useEffect(() => {
    getCustomStyle()
    window.electron.ipcRenderer.removeEventListener(IPC_TYPES.SERVER_PAGE);
    window.electron.ipcRenderer.on(IPC_TYPES.SERVER_PAGE, (arg: any) => {
      switch (arg.type) {
        case LOG_TYPES.SERVER_LOG:
          setLogs((prev) => [
            ...prev,
            {
              message: arg.msg,
              type: 'log',
            },
          ]);
          scrollToLast();
          break;
        case LOG_TYPES.SERVER_LOG_ERROR:
          setLogs((prev) => [
            ...prev,
            {
              message: arg.msg,
              type: 'error-log',
            },
          ]);
          scrollToLast();
          break;
        case ServerPageTypeMessage.SERVER_STATUS:
          if (arg.data.isRun) {
            setIsRun(true);
            setLogOpen(true);
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

  const scrollToLast = () => {
    logRef.current?.scrollIntoView({
      behavior: 'smooth',
    });
  };

  return (
    <>
      {platform === 'darwin' && (
        <WindowControl windowTypes={WindowTypes.LOG_WINDOW}/>
      )}
      <Container>
        <div className={customStyle.sideServer} style={customStyle.maxHeight}>
          <div className="rounded-lg px-16 py-10 content-start">
            <div className="flex justify-center">
              <EverTeamsLogo />
            </div>
          </div>

          <button
            className="flex block rounded-lg border-4  border-transparent items-center bg-violet-800 px-6 py-2 text-center text-base font-medium text-100 w-fit mx-auto my-5 text-gray-200"
            onClick={runServer}
            disabled={loading}
          >
            {loading && (
              <div className="w-4 h-4 border-4 border-blue-500 border-dotted rounded-full animate-spin m-auto"></div>
            )}
            <span>{isRun ? t('FORM.BUTTON.STOP') : t('FORM.BUTTON.START')}</span>
          </button>
        </div>
        <div className="flex flex-col w-3/4 min-h-full max-h-96 px-5" style={{minHeight: '730px'}}>
          <div className={customStyle.boxContent} style={{maxHeight: '690px'}}>
            <details
              className="group"
              open={logOpen}
              onClick={(e) => {
                e.preventDefault();
                setLogOpen((prev) => !prev);
              }}
            >
              <summary className="flex justify-between items-center font-medium cursor-pointer list-none">
                <span className="p-2"> Server Logs</span>
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
                className="inline-block w-full bg-black dark:bg-black text-white text-xs leading-3 rounded-lg shadow-lg"
                style={{
                  minHeight: '500px',
                  maxHeight: '610px',
                  overflowY: 'auto',
                }}
              >
                <div className="ml-1 mt-1 p-2">
                  {logs.length > 0 &&
                    logs.map((log, i) => (
                      <LogView key={i}>
                        {log.type === 'error-log' ? (
                          <span className="text-red-600">{log.message}</span>
                        ) : (
                          <span className="text-white">{log.message}</span>
                        )}
                      </LogView>
                    ))}
                  <div className="py-1" ref={logRef}></div>
                </div>
              </div>
            </details>
          </div>
        </div>
      </Container>
    </>
  );
}
