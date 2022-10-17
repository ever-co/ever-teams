import classNames from "classnames"
import logoImg from "data-base64:~assets/logo/gauzy-teams-dark.png"
import React, { FC, useState } from "react"

const svgCaret = (
  <svg
    className="ml-2 w-4 h-4"
    aria-hidden="true"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M19 9l-7 7-7-7"></path>
  </svg>
)

const teams = [
  "ViktorOrfey",
  "Ever IQ Team",
  "Gauzy Teams Team",
  "SoftwareWaves Team"
]

const Header: FC = () => {
  const [dropdownHidden, setHidden] = useState<boolean>(true)
  const [team, setTeam] = useState<string>("ViktorOrfey")

  const onTeamSelect = (name: string) => {
    setTeam(name)
    setHidden(true)
  }

  const teamOptions = teams.map((name) => {
    return (
      <li key={name} onClick={() => onTeamSelect(name)}>
        <a
          href="#"
          className="block py-2 px-4 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">
          {name}
        </a>
      </li>
    )
  })

  return (
    <div className="flex justify-between mb-4 items-center">
      <img className="w-32 h-full" src={logoImg}></img>
      <div className="min-w-[180px] text-end">
        <span className="mr-2">Team:</span>
        <button
          id="dropdownDefault"
          data-dropdown-toggle="dropdown"
          className="text-white bg-slate-800 hover:bg-slate-700 focus:outline-none font-medium rounded-lg text-sm px-4 py-2.5 text-center inline-flex items-center"
          type="button"
          onClick={() => setHidden((prev) => !prev)}>
          <span className="w-24 overflow-hidden whitespace-nowrap text-ellipsis">
            {team}
          </span>
          {svgCaret}
        </button>
        <div
          id="dropdown"
          className={classNames(
            "scrollbar absolute overflow-auto max-h-64 mt-1.5 z-10 w-44 bg-white rounded divide-y divide-gray-100 shadow dark:bg-gray-700 ml-6",
            dropdownHidden && "hidden"
          )}>
          <ul
            className="py-1 text-sm text-gray-700 dark:text-gray-200"
            aria-labelledby="dropdownDefault">
            {teamOptions}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default Header
