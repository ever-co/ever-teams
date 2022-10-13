import React from "react";
import MainLogo from "./mainLogo";
import TeamDropdown from "./teamDropdown";

export const Header = () => (
    <header  className="fixed w-full">
        <nav className="bg-white px-4 lg:px-10 py-6 dark:bg-gray-800 shadow-md">
            <div className="flex flex-wrap justify-between items-center mx-auto max-w-screen-xl">
                <div className="flex items-center space-x-3">
                    <MainLogo />
                    <div className="">-</div>
                    <TeamDropdown />
                </div>

                <div className="flex items-center">
                    <ul className="flex flex-row justify-start pl-0 mb-0 md-max:w-full">
                        <li className="flex items-center px-4">
                            <a href="javascript:;" className="p-0 transition-all text-sm ease-nav-brand text-slate-500">
                                <svg width="21" height="23" viewBox="0 0 21 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M17.52 15.71L15.72 13.9V9.43999C15.744 7.78381 15.1679 6.1749 14.0981 4.91032C13.0284 3.64575 11.5372 2.81092 9.90001 2.55999C8.94982 2.43485 7.98388 2.5138 7.06662 2.79156C6.14936 3.06932 5.30188 3.53951 4.58074 4.17075C3.85959 4.80199 3.28136 5.57976 2.88462 6.45218C2.48788 7.3246 2.28176 8.2716 2.28001 9.22999V13.9L0.480012 15.71C0.253918 15.9399 0.100596 16.2313 0.0392123 16.5478C-0.022171 16.8643 0.0111083 17.1919 0.13489 17.4896C0.258671 17.7873 0.467463 18.042 0.735163 18.2217C1.00286 18.4014 1.31759 18.4982 1.64001 18.5H5.00001V18.84C5.04672 19.8552 5.49396 20.8105 6.24374 21.4965C6.99351 22.1826 7.98467 22.5434 9.00001 22.5C10.0154 22.5434 11.0065 22.1826 11.7563 21.4965C12.5061 20.8105 12.9533 19.8552 13 18.84V18.5H16.36C16.6824 18.4982 16.9972 18.4014 17.2649 18.2217C17.5326 18.042 17.7414 17.7873 17.8651 17.4896C17.9889 17.1919 18.0222 16.8643 17.9608 16.5478C17.8994 16.2313 17.7461 15.9399 17.52 15.71ZM11 18.84C10.9446 19.321 10.7057 19.762 10.3331 20.0713C9.96051 20.3805 9.483 20.5341 9.00001 20.5C8.51703 20.5341 8.03951 20.3805 7.66694 20.0713C7.29437 19.762 7.05547 19.321 7.00001 18.84V18.5H11V18.84ZM2.51001 16.5L3.69001 15.32C3.87718 15.1339 4.02567 14.9127 4.12694 14.669C4.2282 14.4252 4.28022 14.1639 4.28001 13.9V9.22999C4.28056 8.55539 4.4254 7.88871 4.70481 7.2747C4.98422 6.66068 5.39174 6.11354 5.90001 5.66999C6.40143 5.21567 6.99559 4.87574 7.64135 4.67372C8.28712 4.4717 8.96907 4.41242 9.64001 4.49999C10.7965 4.68776 11.8462 5.287 12.5959 6.18737C13.3456 7.08773 13.7448 8.22862 13.72 9.39999V13.9C13.7185 14.1632 13.7689 14.4241 13.8685 14.6678C13.968 14.9115 14.1146 15.1331 14.3 15.32L15.49 16.5H2.51001Z" fill="black" />
                                    <path d="M15 8.75C14.0054 8.75 13.0516 8.35491 12.3483 7.65165C11.6451 6.94839 11.25 5.99456 11.25 5C11.25 4.00544 11.6451 3.05161 12.3483 2.34835C13.0516 1.64509 14.0054 1.25 15 1.25C15.9946 1.25 16.9484 1.64509 17.6517 2.34835C18.3549 3.05161 18.75 4.00544 18.75 5C18.75 5.99456 18.3549 6.94839 17.6517 7.65165C16.9484 8.35491 15.9946 8.75 15 8.75Z" fill="#6E49E8" />
                                </svg>
                            </a>
                        </li>

                        <li className="flex items-center px-4">
                            <a href="javascript:;" className="p-0 transition-all text-sm ease-nav-brand text-slate-500">
                                <svg width="20" height="19" viewBox="0 0 20 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M15 2.83331H4.99999C3.15904 2.83331 1.66666 4.3257 1.66666 6.16665V14.5C1.66666 16.3409 3.15904 17.8333 4.99999 17.8333H15C16.8409 17.8333 18.3333 16.3409 18.3333 14.5V6.16665C18.3333 4.3257 16.8409 2.83331 15 2.83331Z" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                                    <path d="M6.66666 1.16666V4.49999M13.3333 1.16666V4.49999M1.66666 7.83332H18.3333" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                                </svg>
                            </a>
                        </li>
                        <li className="flex items-center space-x-4">
                            <span className="font-normal ml-3 block truncate">Roslan Kan</span>
                            <img src="https://images.unsplash.com/photo-1491528323818-fdd1faba62cc?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="" className="h-6 w-6 flex-shrink-0 rounded-full" />
                        </li>
                    </ul>
                </div>
            </div>
        </nav>
    </header>
);

export default Header;
