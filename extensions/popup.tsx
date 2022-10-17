import classNames from "classnames"
import React, { useReducer, useState } from "react"

import "./style.css"

const tailwindInputClass = `form-control
block
px-3
py-1.5
text-base
font-normal
text-gray-700
bg-white bg-clip-padding
border border-solid border-gray-300
rounded
transition
ease-in-out
m-0
focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none`

function IndexPopup() {
  const [dropdownHidden, setHidden] = useState<boolean>(true)

  return (
    <div className="flex flex-col p-4" style={{ width: "400px" }}>
      <div className="flex justify-between mb-4">
        <span>Gauzy Teams</span>
        <div>
          <span className="mt-2">Team:</span>
          <button
            id="dropdownDefault"
            data-dropdown-toggle="dropdown"
            className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2.5 text-center inline-flex items-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
            type="button"
            onClick={() => setHidden((prev) => !prev)}>
            ViktorOrfey{" "}
            <svg
              className="ml-2 w-4 h-4"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>
          {/* <!-- Dropdown menu --> */}
          <div
            id="dropdown"
            className={classNames(
              "scrollbar absolute overflow-auto max-h-24 mt-1.5 -ml-1 z-10 w-44 bg-white rounded divide-y divide-gray-100 shadow dark:bg-gray-700",
              dropdownHidden && "hidden"
            )}>
            <ul
              className="py-1 text-sm text-gray-700 dark:text-gray-200"
              aria-labelledby="dropdownDefault">
              <li>
                <a
                  href="#"
                  className="block py-2 px-4 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">
                  Ever IQ Team
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="block py-2 px-4 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">
                  Gauzy Teams Team
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="block py-2 px-4 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">
                  ScreenMood Team
                </a>
              </li>
            </ul>
          </div>
        </div>
        {/* team selector */}
      </div>

      {/* activeTask */}
      <div className="bg-zinc-100 rounded p-2">
        <div className="flex items-center mb-2">
          <span className=" w-24">Active Task:</span>
          {/* taskInput  */}
          <input
            type="text"
            className={tailwindInputClass}
            placeholder="Gauzy Teams Chrome Extension"
          />
          {/* Add task */}
          <button className="ml-2 bg-slate-900 text-white rounded p-2">
            Add
          </button>
        </div>
        <div>
          <div className="flex items-center">
            <span className="w-24">Estimated: </span>
            <input
              className={tailwindInputClass}
              type="text"
              placeholder="00:00:00"
            />
          </div>
        </div>
      </div>

      {/* timer */}
      <div className="my-12 text-center">
        <span className="text-xl p-4 bg-slate-900 rounded-xl text-white">
          00:00:00
        </span>
      </div>

      {/* timerControls */}

      <div className="flex flex-col">
        <div className="flex justify-between mb-2">
          <span>
            Total worked today: <b>00:00:00</b>
          </span>
          <a>Check team</a>
        </div>
        <button className="p-2 text-lg bg-slate-800 rounded-lg text-white outline-none">
          Start
        </button>
      </div>
    </div>
  )
}

export default IndexPopup
