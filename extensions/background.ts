import browser from "~misc/browser"
import { MessageTypesEnum } from "~typescript/enums/MessageTypesEnum"
import { TimerStateEnum } from "~typescript/enums/TimerStateEnum"

let timer = 0
let timeout: ReturnType<typeof setTimeout> | null = null
let runState: TimerStateEnum = TimerStateEnum.stopped
let interval = 1000 // ms
let workPort: chrome.runtime.Port | null = null

browser.runtime.onConnect.addListener((port) => {
  workPort = port
  let expected = Date.now() + interval

  workPort && workPort.postMessage({ timer, runState })

  function step() {
    let dt = Date.now() - expected // the drift (positive for overshooting)
    if (dt > interval) {
      // something awful happened. Maybe the browser (tab) was inactive?
      // possibly special handling to avoid futile "catch up" run
    }
    timer += 1
    workPort && workPort.postMessage({ timer, runState })

    expected += interval
    timeout = setTimeout(step, interval) // take into account drift
  }

  port.onDisconnect.addListener(() => {
    workPort = null
    timeout = null
  })

  port.onMessage.addListener((msg: MessageTypesEnum) => {
    if (msg === MessageTypesEnum.startTimer) {
      if (runState !== TimerStateEnum.running) {
        timeout = setTimeout(step, interval)
        runState = TimerStateEnum.running
      }
    }
    if (msg === MessageTypesEnum.pauseTimer) {
      clearTimeout(timeout)
      timeout = null
      runState = TimerStateEnum.paused
    }
    if (msg === MessageTypesEnum.stopTimer) {
      clearTimeout(timeout)
      timeout = null
      timer = 0
      runState = TimerStateEnum.stopped
    }
  })
})
export {}
