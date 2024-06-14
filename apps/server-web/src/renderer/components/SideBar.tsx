import { Link } from 'react-router-dom'
export function SideBar({ children }) {
    return (
        <div className="min-h-screen flex flex-col flex-auto flex-shrink-0 antialiased bg-gray-50 text-gray-800">
        <div className="fixed flex flex-col top-0 left-0 w-1/4 bg-white h-full">
            <div className="overflow-y-auto overflow-x-hidden flex-grow">
                <ul className="flex flex-col py-4 space-y-1">
                    <li>
                    <Link to="" className="relative flex flex-row items-center h-11 focus:outline-none bg-gray-50 text-gray-600 text-gray-800 border-l-4 border-transparent border-indigo-500 pr-6">
                        <span className="inline-flex justify-center items-center ml-4">
                        {/* <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http:www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg> */}
                        </span>
                        <span className="ml-2 text-sm tracking-wide truncate">Server</span>
                        {/* <span className="px-2 py-0.5 ml-auto text-xs font-medium tracking-wide text-indigo-500 bg-indigo-50 rounded-full">New</span> */}
                    </Link>
                    </li>
                    <li>
                    <Link to="" className="relative flex flex-row items-center h-11 focus:outline-none hover:bg-gray-50 text-gray-600 hover:text-gray-800 border-l-4 border-transparent hover:border-indigo-500 pr-6">
                        <span className="inline-flex justify-center items-center ml-4">
                        {/* <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http:www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path></svg> */}
                        </span>
                        <span className="ml-2 text-sm tracking-wide truncate">Updater</span>
                    </Link>
                    </li>
                    <li>
                    <Link to="" className="relative flex flex-row items-center h-11 focus:outline-none hover:bg-gray-50 text-gray-600 hover:text-gray-800 border-l-4 border-transparent hover:border-indigo-500 pr-6">
                        <span className="inline-flex justify-center items-center ml-4">
                        {/* <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http:www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg> */}
                        </span>
                        <span className="ml-2 text-sm tracking-wide truncate">About</span>
                        {/* <span className="px-2 py-0.5 ml-auto text-xs font-medium tracking-wide text-red-500 bg-red-50 rounded-full">1.2k</span> */}
                    </Link>
                    </li>
                </ul>
            </div>
        </div>
        <div className='flex flex-col relative left-64 w-3/4'>
            <div className="relative overflow-y-auto overflow-x-hidden flex-grow left-16 top-16 w-3/4">
              {children}
            </div>
        </div>
        </div>
    )
}
