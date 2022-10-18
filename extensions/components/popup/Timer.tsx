import React, { useEffect, useState } from "react"

import browser from "~misc/browser"
import { MessageTypesEnum } from "~typescript/enums/MessageTypesEnum"
import { TimerStateEnum } from "~typescript/enums/TimerStateEnum"

const Timer = () => {
  const [port, setPort] = useState<chrome.runtime.Port | null>(null)
  const [timeString, setTimeString] = useState<string>("00:00:00")
  const [isRunning, setIsRunning] = useState<boolean>(false)

  useEffect(() => {
    const newPort = browser.runtime.connect({ name: "timer" })
    setPort(newPort)
    newPort.onMessage.addListener((msg) => {
      const parsedString = new Date(msg.timer * 1000)
        .toISOString()
        .substr(11, 8)
      setTimeString(parsedString)
      setIsRunning(msg.runState === TimerStateEnum.running)
    })
  }, [])

  const startTimer = async () => {
    setIsRunning(true)
    port.postMessage(MessageTypesEnum.startTimer)
  }

  const pauseTimer = async () => {
    setIsRunning(false)
    port.postMessage(MessageTypesEnum.pauseTimer)
  }

  return (
    <>
      {/* timer */}
      <div className="my-12 text-center">
        <span className="text-xl p-4 bg-slate-900 rounded-xl text-white">
          {timeString}
        </span>
      </div>

      {/* timerControls */}
      <div className="flex flex-col">
        <div className="flex justify-between mb-2">
          <span>
            Total worked today:
            <b>{timeString}</b>
          </span>
          <a>Check team</a>
        </div>
        <button
          className="p-2 text-lg bg-slate-800 rounded-lg text-white outline-none"
          onClick={!isRunning ? startTimer : pauseTimer}>
          {!isRunning ? "Start" : "Pause"}
        </button>
      </div>
    </>
  )
}

export default Timer
