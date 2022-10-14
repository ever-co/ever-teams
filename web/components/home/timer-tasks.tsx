import TeamDropdown from "../layout/header/teamDropdown";

export function TimerTasksSection() {
  return (
    <div className="grid grid-cols-4 pt-36 mb-4 justify-between">
      <div className="col-span-2">
        <div className="max-w-[22rem] rounded drop-shadow-sm bg-white">
          <div className="px-4 py-4 inline-flex items-center space-x-6 w-full">
            <div className="font-bold text-md flex-1">Active task: </div>
            <span className="flex-[2]">
              <TeamDropdown />
            </span>
          </div>
        </div>
        <div className="mt-5">
          <span className="bg-[#6e49e82a] rounded-md text-sm font-medium text-slate-600  dark:text-white p-2">
            Estimated: 40h:15min
          </span>
        </div>
      </div>
      <div className="col-span-2 justify-end flex">
        <div className="p-4 w-96 rounded py-4 bg-white">
          <div className="flex flex-row justify-between py-1">
            <div>
              <h2 className="mb-4 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                02:10:59
              </h2>
            </div>
            {/* <div>
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 32 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M16 30C12.287 30 8.72601 28.525 6.1005 25.8995C3.475 23.274 2 19.713 2 16C2 12.287 3.475 8.72601 6.1005 6.1005C8.72601 3.475 12.287 2 16 2C19.713 2 23.274 3.475 25.8995 6.1005C28.525 8.72601 30 12.287 30 16C30 19.713 28.525 23.274 25.8995 25.8995C23.274 28.525 19.713 30 16 30ZM16 32C20.2435 32 24.3131 30.3143 27.3137 27.3137C30.3143 24.3131 32 20.2435 32 16C32 11.7565 30.3143 7.68687 27.3137 4.68629C24.3131 1.68571 20.2435 0 16 0C11.7565 0 7.68687 1.68571 4.68629 4.68629C1.68571 7.68687 0 11.7565 0 16C0 20.2435 1.68571 24.3131 4.68629 27.3137C7.68687 30.3143 11.7565 32 16 32Z"
                    fill="#6E49E8"
                  />
                  <path
                    d="M12.542 10.11C12.7056 10.0258 12.8892 9.9883 13.0727 10.0017C13.2562 10.0151 13.4324 10.0789 13.582 10.186L20.582 15.186C20.7116 15.2785 20.8173 15.4006 20.8902 15.5422C20.9631 15.6838 21.0011 15.8408 21.0011 16C21.0011 16.1593 20.9631 16.3162 20.8902 16.4578C20.8173 16.5994 20.7116 16.7215 20.582 16.814L13.582 21.814C13.4325 21.921 13.2563 21.9847 13.0729 21.9982C12.8895 22.0116 12.706 21.9741 12.5425 21.89C12.379 21.8059 12.2418 21.6783 12.1461 21.5213C12.0504 21.3643 11.9999 21.1839 12 21V11C11.9998 10.8162 12.0503 10.6358 12.1459 10.4788C12.2415 10.3218 12.3786 10.1942 12.542 10.11Z"
                    fill="#6E49E8"
                  />
                </svg>
              </div> */}

            <div>
              <button className="px-4 py-2 inline-flex cursor-pointer rounded-md items-center bg-[#6E49E8]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="white"
                  className="w-4 h-6 mr-2"
                >
                  <path
                    fill-rule="evenodd"
                    d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
                    clip-rule="evenodd"
                  />
                </svg>
                <span className="text-white text-sm font-bold">Start</span>
              </button>
            </div>
          </div>
          <div className="flex flex-row py-2">
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
              <div
                className="bg-purple-600 h-2.5 rounded-full dark:bg-purple-500"
                style={{ width: "45%" }}
              ></div>
            </div>
          </div>
          <div className="flex flex-row justify-between px-0.5">
            <div>00:00</div>
            <div>02:12:30</div>
          </div>
        </div>
      </div>
    </div>
  );
}
