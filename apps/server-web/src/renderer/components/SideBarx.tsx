import DocumentMagnifyingGlassIcon from "@heroicons/react/20/solid/DocumentMagnifyingGlassIcon";
import CogIcon from "@heroicons/react/20/solid/CogIcon";
import { Link } from "react-router-dom";
import { IPC_TYPES } from "../../main/helpers/constant";
import { JSX, useState } from "react";
import { EverTeamsLogo } from "./svgs";

interface SideBarxProps {
  children: JSX.Element[] | JSX.Element
}

export function SideBarx({ children }: SideBarxProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);


  const openSetting = () => {
    window.electron.ipcRenderer.sendMessage(IPC_TYPES.CONTROL_BUTTON, {
      type: 'open-setting',
    });
  }

  return (
    <div className="flex h-[97vh] w-full bg-gray-50 dark:bg-[#25272D] font-sans">

      <aside
        className={`dark:bg-[#2b2b2f] bg-gray-200 flex flex-col shadow-xl transition-all duration-300 relative rounded-r-xl text-gray-600 dark:text-white ${isOpen ? 'w-48' : 'w-12'
          }`}
      >

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="absolute -right-3 top-6 bg-indigo-600 text-white p-1.5 rounded-full hover:bg-indigo-700 transition-colors z-10 focus:outline-none shadow-md"
        >
          <svg
            className={`w-4 h-4 transition-transform duration-300 ${isOpen ? '' : 'rotate-180'
              }`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
          </svg>
        </button>

        <div className="h-16 flex items-center px-4 border-gray-800">
          <span
            className={`text-white text-xl font-bold tracking-wider whitespace-nowrap overflow-hidden transition-all duration-300 ${isOpen ? 'ml-4 opacity-100 w-auto' : 'ml-0 opacity-0 w-0'
              }`}
          >
            <EverTeamsLogo />
          </span>
        </div>

        <nav className="flex-1 py-4 space-y-2 overflow-y-auto overflow-x-hidden">
          <Link to="/history-console" className="flex items-center px-3 py-3 text-gray-600 dark:text-white bg-gray-50 dark:bg-[#25272D] rounded-lg transition-colors" title="Dashboard">
            <DocumentMagnifyingGlassIcon className="w-4 h-4 flex-shrink-0" />
            <span
              className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isOpen ? 'ml-4 opacity-100 w-auto' : 'ml-0 opacity-0 w-0'
                }`}
            >
              Logs
            </span>
          </Link>
        </nav>

        <div className="border-gray-800">
          <button
            onClick={() => openSetting()}
            className="flex items-center px-3 py-3 text-gray-400 rounded-lg hover:bg-gray-800 transition-colors w-full"
            title="Settings"
          >
            <CogIcon className="w-6 h-6 text-gray-400 flex-shrink-0" />

          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-hidden">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>

    </div>
  )
}
