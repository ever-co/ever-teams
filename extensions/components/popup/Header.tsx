import classNames from "classnames"
import logoImg from "data-base64:~assets/logo/gauzy-teams-dark.png"
import React, { FC, useState } from "react"

import AppDropdown from "~components/shared/AppDropdown"
import { textEllipsis } from "~misc/tailwindClasses"

const teams = [
  "ViktorOrfey",
  "Ever IQ Team",
  "Gauzy Teams Team",
  "SoftwareWaves Team"
]

const Header: FC = () => {
  const [team, setTeam] = useState<string>("ViktorOrfey")

  const onTeamSelect = (name: string) => {
    setTeam(name)
  }

  return (
    <div className="flex justify-between mb-4 items-center">
      <img className="w-32 h-full" src={logoImg}></img>
      <div className="flex items-center min-w-[180px] text-end">
        <span className="mr-2">Team:</span>
        <AppDropdown
          buttonTitle={team}
          buttonClassNames={classNames(
            "text-white bg-slate-800 hover:bg-slate-700 focus:outline-none font-medium rounded-lg text-sm px-4 py-2.5 text-center",
            textEllipsis,
            "w-36"
          )}
          options={teams}
          onOptionSelect={onTeamSelect}
          optionContainerClassNames="-ml-8"
        />
      </div>
    </div>
  )
}

export default Header
