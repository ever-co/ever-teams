import React from "react"

import { useStopwatch } from "~node_modules/react-timer-hook"

import Header from "./components/popup/Header"

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
  const { seconds, minutes, hours, days, isRunning, start, pause, reset } =
    useStopwatch({ autoStart: false })
  const s = seconds < 10 ? `0${seconds}` : seconds
  const m = minutes < 10 ? `0${minutes}` : minutes
  const h = hours < 10 ? `0${hours}` : hours

  return (
    <div className="flex flex-col p-4" style={{ width: "400px" }}>
      <Header />

      {/* activeTask */}
      <div className="bg-zinc-100 rounded p-2">
        <div className="flex items-center mb-2">
          <span className=" w-24">Active Task:</span>
          <input
            type="text"
            className={tailwindInputClass}
            placeholder="Gauzy Teams Chrome Extension"
          />
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
          {h}:{m}:{s}
        </span>
      </div>

      {/* timerControls */}
      <div className="flex flex-col">
        <div className="flex justify-between mb-2">
          <span>
            Total worked today:
            <b>
              {h}:{m}:{s}
            </b>
          </span>
          <a>Check team</a>
        </div>
        <button
          className="p-2 text-lg bg-slate-800 rounded-lg text-white outline-none"
          onClick={!isRunning ? start : pause}>
          {!isRunning ? "Start" : "Pause"}
        </button>
      </div>
    </div>
  )
}

export default IndexPopup
