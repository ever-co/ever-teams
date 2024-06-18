import { Link } from 'react-router-dom';
interface SideMenu {
    displayName: string;
    key: string;
    isActive: boolean;
  }
type Props = {
    children: string | JSX.Element | JSX.Element[],
    menus: SideMenu[],
    menuChange: (key: string) => void
}
export function SideBar({ children, menus, menuChange }:Props) {
    return (
        <div className="min-h-screen flex flex-col flex-auto flex-shrink-0 antialiased bg-gray-50 text-gray-800">
        <div className="fixed flex flex-col top-0 left-0 w-1/4 bg-white h-full">
            <div className="overflow-y-auto overflow-x-hidden flex-grow">
                <ul className="flex flex-col py-4 space-y-1">
                    {menus.length && menus.map((menu) => (
                        <li key={menu.key}>
                            <Link
                                to=""
                                className={`relative flex flex-row items-center h-11 focus:outline-none ${!menu.isActive ? 'hover:' : '' }bg-gray-50 text-gray-600 ${!menu.isActive ? 'hover:' : '' }text-gray-800 border-l-4 border-transparent ${!menu.isActive ? 'hover:' : '' }border-indigo-500 pr-6`}
                                onClick={() => {
                                    menuChange(menu.key);
                                }}
                            >
                                <span className="inline-flex justify-center items-center ml-4">
                                {/* <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http:www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path></svg> */}
                                </span>
                                <span className="ml-2 text-sm tracking-wide truncate">{menu.displayName}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
        <div className='flex flex-col relative left-64 w-3/4'>
            {children}
        </div>
        </div>
    )
}
