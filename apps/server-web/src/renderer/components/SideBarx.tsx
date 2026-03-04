import DocumentMagnifyingGlassIcon from "@heroicons/react/20/solid/DocumentMagnifyingGlassIcon";
import CogIcon from "@heroicons/react/20/solid/CogIcon";
import { Link } from "react-router-dom";
import { IPC_TYPES } from "../../main/helpers/constant";
import { JSX } from "react";
import { EverTeamsLogo } from "./svgs";

interface SideBarxProps {
  children: JSX.Element[] | JSX.Element
}

export function SideBarx({ children }: SideBarxProps) {
  const toggleSidebar = () => {
    const sidebar = document.getElementById('sidebar');
    const toggleIcon = document.getElementById('toggle-icon');
    const texts = document.querySelectorAll('.sidebar-text');

    // 1. Toggle the width of the main sidebar container
    sidebar?.classList.toggle('w-64');
    sidebar?.classList.toggle('w-16');

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


  const openSetting = () => {
    window.electron.ipcRenderer.sendMessage(IPC_TYPES.CONTROL_BUTTON, {
      type: 'open-setting',
    });
  }

  return (
    <div className="flex h-[97vh] w-full bg-gray-50 dark:bg-[#25272D] font-sans">
      <aside id="sidebar" className="w-64 dark:bg-[#2b2b2f] bg-gray-200  flex flex-col shadow-xl transition-all duration-300 relative rounded-r-xl text-gray-600 dark:text-white">

        <button onClick={() => {
          toggleSidebar()
        }} className="absolute -right-3 top-6 bg-indigo-600 text-white p-1.5 rounded-full hover:bg-indigo-700 transition-colors z-10 focus:outline-none shadow-md">
          <svg id="toggle-icon" className="w-4 h-4 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
          </svg>
        </button>

        <div className="h-16 flex items-center px-4 border-gray-800">
          {/* <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center flex-shrink-0 text-gray-600 dark:text-white font-bold">M</div> */}
          <span className="sidebar-text text-white text-xl font-bold tracking-wider ml-4 whitespace-nowrap overflow-hidden transition-all duration-300 opacity-100 w-auto"><EverTeamsLogo /></span>
        </div>

        <nav className="flex-1 py-4 space-y-2 overflow-y-auto overflow-x-hidden">
          <Link to="/history-console" className="flex items-center px-3 py-3 text-gray-600 dark:text-white bg-gray-50 dark:bg-[#25272D] rounded-lg transition-colors" title="Dashboard">
            <DocumentMagnifyingGlassIcon className="w-4 h-4" />
            <span className="sidebar-text ml-4 whitespace-nowrap overflow-hidden transition-all duration-300 opacity-100 w-auto">Logs</span>
          </Link>
        </nav>

        <div className="p-3 border-gray-800">
          <button onClick={() => {
            openSetting();
          }} className="flex items-center px-3 py-3 text-gray-400 rounded-lg hover:bg-gray-800 transition-colors w-full" title="Settings">
            <CogIcon className="w-8 h-8 text-gray-400" />
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-hidden">
        <div className="max-w-4xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
