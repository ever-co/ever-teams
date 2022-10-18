import { act } from "react-dom/test-utils"

import browser from "~misc/browser"
import { MessageTypesEnum } from "~typescript/enums/MessageTypesEnum"
import { TimerStateEnum } from "~typescript/enums/TimerStateEnum"
import type { ITimerTask } from "~typescript/types/Tasks"

let tasks: ITimerTask[] = []
let activeTaskIndex: number | null = null
let timeout: ReturnType<typeof setTimeout> | null = null
let runState: TimerStateEnum = TimerStateEnum.stopped
let interval = 1000 // ms
let workPort: chrome.runtime.Port | null = null

browser.runtime.onConnect.addListener((port) => {
  workPort = port
  let expected = Date.now() + interval

  if (tasks.length > 0 && activeTaskIndex) {
    workPort &&
      workPort.postMessage({ timer: tasks[activeTaskIndex].timer, runState })
  }

  function step() {
    if (tasks.length > 0 && activeTaskIndex) {
      let dt = Date.now() - expected // the drift (positive for overshooting)
      if (dt > interval) {
        // something awful happened. Maybe the browser (tab) was inactive?
        // possibly special handling to avoid futile "catch up" run
      }
      tasks[activeTaskIndex].timer += 1
      workPort &&
        workPort.postMessage({ timer: tasks[activeTaskIndex].timer, runState })

      expected += interval
      timeout = setTimeout(step, interval) // take into account drift
    }
  }

  port.onDisconnect.addListener(() => {
    workPort = null
    timeout = null
  })

  port.onMessage.addListener(
    (msg: { type: MessageTypesEnum; payload?: any }) => {
      if (activeTaskIndex) {
        if (
          msg.type === MessageTypesEnum.startTimer &&
          runState !== TimerStateEnum.running
        ) {
          timeout = setTimeout(step, interval)
          runState = TimerStateEnum.running
        }
        if (msg.type === MessageTypesEnum.pauseTimer) {
          clearTimeout(timeout)
          timeout = null
          runState = TimerStateEnum.paused
        }
        if (msg.type === MessageTypesEnum.stopTimer) {
          clearTimeout(timeout)
          timeout = null
          tasks[activeTaskIndex].timer = 0
          runState = TimerStateEnum.stopped
        }
      }

      if (msg.type === MessageTypesEnum.updateTasks && msg.payload) {
        tasks = msg.payload
      }
      if (
        msg.type == MessageTypesEnum.updateActiveTaskIndex &&
        msg.payload &&
        tasks.length > 0
      ) {
        const index = tasks.findIndex((x) => x.id === msg.payload.id)

        if (index !== -1) {
          activeTaskIndex = index
        }
      }
    }
  )
})
export {}
