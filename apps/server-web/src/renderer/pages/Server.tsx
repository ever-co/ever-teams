import { useState, useEffect, useRef  } from 'react';
import { ServerPageTypeMessage } from '../../main/helpers/constant';
import { IPC_TYPES, LOG_TYPES } from '../../main/helpers/constant';
import { useTranslation } from 'react-i18next';
import Container from '../components/container';
import { SideBarx } from '../components/SideBarx';

export function ServerPage() {
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


  useEffect(() => {
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
      <Container>
        <SideBarx>
          {/* logs page */}
          <div className="max-w-5xl mx-auto bg-gray-50 dark:bg-[#25272D] p-6 font-sans text-gray-800 dark:text-gray-200">

            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 space-y-4 md:space-y-0">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Server Logs</h1>
                <p className="text-sm text-gray-500 flex items-center mt-1">
                  Status: <span className={`flex w-2 h-2 bg-${isRun ? 'green' : 'red'}-500 rounded-full mx-2 animate-pulse`}></span> {isRun ? 'Running' : 'Stopped'}
                </p>
              </div>

              <div className="flex space-x-3">
                {isRun && (
                  <button
                    onClick={runServer}
                    className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium shadow-sm"
                    disabled={loading}
                  >
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clip-rule="evenodd"></path></svg>
                    Stop Server
                  </button>
                )}
                {!isRun && (
                  <button
                    onClick={runServer}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium shadow-sm"
                    disabled={loading}
                  >
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"></path></svg>
                    Start Server
                  </button>
                )}
              </div>
            </div>

            <div className="bg-gray-200 dark:bg-[#25272D] border border-gray-200 dark:border-gray-600 rounded-xl overflow-y-auto max-h-[80vh]">
              <ul className="font-mono text-sm">
                {
                  logs && logs.length > 0 && logs.map((log) => (
                    <li className="flex flex-col sm:flex-row gap-2 sm:gap-6 p-4 transition-colors">
                      <div className="flex-shrink-0 text-gray-400 w-28 whitespace-nowrap">
                        {new Date().toLocaleTimeString()}
                      </div>
                      <div className="flex-shrink-0 w-20">
                        <span className={`${log.type === 'error-log' ? 'text-red-600' : 'text-blue-600'} font-bold px-2 py-0.5 rounded text-xs`}>{log.type === 'error-log' ? 'Error' : 'Info'}</span>
                      </div>
                      <div className="flex-1 text-gray-800 dark:text-gray-200 break-words">
                        <span className="font-semibold">[web-server]</span> {log.message}
                      </div>
                    </li>
                  ))
                }
                {(!logs || logs.length === 0) && (
                  <li className="flex flex-col sm:flex-row gap-2 sm:gap-6 p-4 border-l-4  hover:bg-gray-50 hover:dark:bg-gray-500 transition-colors">
                    <div className="flex-shrink-0 text-gray-400 w-28 whitespace-nowrap">
                      {new Date().toLocaleTimeString()}
                    </div>
                    <div className="flex-shrink-0 w-20">
                      <span className="text-blue-600 font-bold px-2 py-0.5 rounded text-xs">Info</span>
                    </div>
                    <div className="flex-1 text-gray-800 dark:text-gray-200 break-words">
                      <span className="font-semibold">[web-server]</span> Waiting for server logs...
                    </div>
                  </li>
                )}
                <li ref={logRef} className="flex flex-col sm:flex-row gap-2 sm:gap-6 p-4 hover:bg-gray-50 transition-colors">
                </li>
              </ul>
            </div>
          </div>
        </SideBarx>
        <div></div>
      </Container>
    </>
  );
}
