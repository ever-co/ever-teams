import React, { useEffect, useState } from "react"

import Header from "~components/popup/Header"
import Tasks from "~components/popup/Tasks"
import Timer from "~components/popup/Timer"

import "./style.css"

import browser from "~misc/browser"
import { MessageTypesFromBackgroundEnum } from "~typescript/enums/MessageTypesEnum"
import { TimerStateEnum } from "~typescript/enums/TimerStateEnum"
import { IPostMessage } from "~typescript/interfaces/PostMessage"
import { ITimerUpdate } from "~typescript/interfaces/TimerUpdate"

function IndexPopup() {
  const [port, setPort] = useState<chrome.runtime.Port | null>(null)

  useEffect(() => {
    const newPort = browser.runtime.connect({ name: "timer" })
    setPort(newPort)
  }, [])

  return (
    <div className="flex flex-col p-4" style={{ width: "400px" }}>
      <Header />
      <Tasks port={port} />
      <Timer port={port} />
    </div>
  )
}

export default IndexPopup
