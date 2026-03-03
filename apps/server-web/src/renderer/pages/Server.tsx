import { useState, useEffect, useRef, ReactNode } from 'react';
import { ServerPageTypeMessage, WindowTypes } from '../../main/helpers/constant';
import { IPC_TYPES, LOG_TYPES } from '../../main/helpers/constant';
import { EverTeamsLogo } from '../components/svgs';
import { useTranslation } from 'react-i18next';
import WindowControl from '../components/window-control';
import Container from '../components/container';
import { CUSTOM_STYLE } from '../libs/constant';
import { IDevices } from '../../main/helpers/interfaces';
import DocumentMagnifyingGlassIcon from '@heroicons/react/20/solid/DocumentMagnifyingGlassIcon';
import CogIcon from '@heroicons/react/20/solid/CogIcon';
import { Link } from 'react-router-dom';

const LogView = ({ children }: { children: ReactNode }) => {
  return <div className="py-1">{children}</div>;
};

export function ServerPage() {
  const [customStyle, setCustomStyle] = useState(CUSTOM_STYLE.WINDOWS);
  const [platform, setPlatform] = useState<IDevices>('win32');
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

  function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggleIcon = document.getElementById('toggle-icon');
    const texts = document.querySelectorAll('.sidebar-text');

    // 1. Toggle the width of the main sidebar container
    sidebar?.classList.toggle('w-64');
    sidebar?.classList.toggle('w-20');

    // 2. Flip the arrow icon
    toggleIcon?.classList.toggle('rotate-180');

    // 3. Toggle visibility and width of the text labels
    texts.forEach(text => {
      text.classList.toggle('opacity-100');
      text.classList.toggle('opacity-0');
      text.classList.toggle('w-auto');
      text.classList.toggle('w-0');

      // Remove margin when collapsed so the remaining icon stays centered
      text.classList.toggle('ml-4');
      text.classList.toggle('ml-0');
    });
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

  const openSettings = () => {
    window.electron.ipcRenderer.sendMessage(IPC_TYPES.CONTROL_BUTTON, {
      type: 'open-settings',
    });
  }

  return (
    <>
      <Container>
        <div className="flex h-screen bg-gray-100 font-sans">
          <aside id="sidebar" className="w-64 bg-gray-900 flex flex-col shadow-xl transition-all duration-300 relative">

            <button onClick={() => {
              toggleSidebar()
            }} className="absolute -right-3 top-6 bg-indigo-600 text-white p-1.5 rounded-full hover:bg-indigo-700 transition-colors z-10 focus:outline-none shadow-md">
              <svg id="toggle-icon" className="w-4 h-4 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
            </button>

            <div className="h-16 flex items-center px-4 border-b border-gray-800">
              <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center flex-shrink-0 text-white font-bold">M</div>
              <span className="sidebar-text text-white text-xl font-bold tracking-wider ml-4 whitespace-nowrap overflow-hidden transition-all duration-300 opacity-100 w-auto"><EverTeamsLogo /></span>
            </div>

            <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto overflow-x-hidden">
              <Link to="/history-console" className="flex items-center px-3 py-3 text-white bg-indigo-600 rounded-lg transition-colors" title="Dashboard">
                <DocumentMagnifyingGlassIcon className="w-5 h-5" />
                <span className="sidebar-text ml-4 whitespace-nowrap overflow-hidden transition-all duration-300 opacity-100 w-auto">Logs</span>
              </Link>
            </nav>

            <div className="p-3 border-t border-gray-800">
              <button onClick={() => {
                openSettings();
              }} className="flex items-center px-3 py-3 text-gray-400 rounded-lg hover:bg-gray-800 transition-colors w-full" title="Settings">
                <CogIcon className="w-8 h-8 text-gray-400" />
              </button>
            </div>
          </aside>

          <main className="flex-1 p-8 overflow-y-hidden">
            <div className="max-w-4xl mx-auto">
              {/* logs page */}
              <div className="max-w-5xl mx-auto p-6 font-sans text-gray-800">

                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 space-y-4 md:space-y-0">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Server Logs</h1>
                    <p className="text-sm text-gray-500 flex items-center mt-1">
                      Status: <span className="flex w-2 h-2 bg-green-500 rounded-full mx-2 animate-pulse"></span> {isRun ? 'Running' : 'Stopped'}
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

                <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-y-auto max-h-[75vh] shadow-inner">
                  <ul className="divide-y divide-gray-200 font-mono text-sm">
                    {
                      logs && logs.length > 0 && logs.map((log) => (
                        <li className="flex flex-col sm:flex-row gap-2 sm:gap-6 p-4 bg-white border-l-4 border-red-500 hover:bg-gray-50 transition-colors">
                          <div className="flex-shrink-0 text-gray-400 w-28 whitespace-nowrap">
                            {new Date().toLocaleTimeString()}
                          </div>
                          <div className="flex-shrink-0 w-20">
                            <span className={`${log.type === 'error-log' ? 'text-red-600' : 'text-blue-600'} font-bold bg-red-50 px-2 py-0.5 rounded text-xs`}>{log.type === 'error-log' ? 'Error' : 'Info'}</span>
                          </div>
                          <div className="flex-1 text-gray-800 break-words">
                            <span className="font-semibold">[web-server]</span> {log.message}
                          </div>
                        </li>
                      ))
                    }
                    {(!logs || logs.length === 0) && (
                      <li className="flex flex-col sm:flex-row gap-2 sm:gap-6 p-4 bg-white border-l-4 border-yellow-400 hover:bg-gray-50 transition-colors">
                        <div className="flex-shrink-0 text-gray-400 w-28 whitespace-nowrap">
                          {new Date().toLocaleTimeString()}
                        </div>
                        <div className="flex-shrink-0 w-20">
                          <span className="text-blue-600 font-bold bg-yellow-50 px-2 py-0.5 rounded text-xs">Info</span>
                        </div>
                        <div className="flex-1 text-gray-800 break-words">
                          <span className="font-semibold">[web-server]</span> Waiting for server logs...
                        </div>
                      </li>
                    )}
                    <li ref={logRef}  className="flex flex-col sm:flex-row gap-2 sm:gap-6 p-4 bg-white border-l-4 border-yellow-400 hover:bg-gray-50 transition-colors">
                    </li>
                  </ul>
                </div>
              </div>
              {/* logs page */}
            </div>
          </main>
        </div>
        <div></div>
      </Container>
    </>
  );
}
