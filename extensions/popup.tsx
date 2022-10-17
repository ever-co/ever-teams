import React from "react"

import Header from "~components/popup/Header"
import Tasks from "~components/popup/Tasks"
import Timer from "~components/popup/Timer"
import { useStopwatch } from "~node_modules/react-timer-hook"

import "./style.css"

export const tailwindInputClass = `form-control
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
  return (
    <div className="flex flex-col p-4" style={{ width: "400px" }}>
      <Header />
      <Tasks />
      <Timer />
    </div>
  )
}

export default IndexPopup
