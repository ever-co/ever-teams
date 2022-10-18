import classNames from "classnames"
import React, { FC, useState } from "react"

import { underlineInput } from "~misc/tailwindClasses"

const TasksEstimatedInputs: FC = () => {
  const [hoursEst, setHoursEstimate] = useState<string>("")
  const [minutesEst, setMinutesEstimate] = useState<string>("")

  const onHoursChange = (event) => {
    const value = event.target.value
    if (value > 999 || value.split("").length > 3 || +value < 0) {
      return setHoursEstimate("")
    }

    setHoursEstimate(value)
  }

  const onMinuteChange = (event) => {
    const value = event.target.value
    if (value > 60 || value.split("").length > 2 || +value < 0) {
      return setMinutesEstimate("")
    }

    setMinutesEstimate(value)
  }

  const onEstimateBlur = (event) => {
    const value = event.target.value
    if (!value) return

    if (+hoursEst < 10 && hoursEst[0] !== "0") {
      const hours = hoursEst ? hoursEst : "0"
      const format = "0" + hours
      setHoursEstimate(format)
    }

    if (+minutesEst < 10 && minutesEst[0] !== "0") {
      const mins = minutesEst ? minutesEst : "0"
      const format = "0" + mins
      setMinutesEstimate(format)
    }
  }

  return (
    <>
      <span className="w-24">Estimated: </span>
      <input
        className={classNames(underlineInput, "w-8")}
        type="number"
        placeholder="00"
        value={hoursEst}
        onChange={onHoursChange}
        onBlur={onEstimateBlur}
      />
      <span className="mx-2">hh</span>
      <input
        className={classNames(underlineInput, "w-6")}
        type="number"
        placeholder="00"
        value={minutesEst}
        onChange={onMinuteChange}
        onBlur={onEstimateBlur}
      />
      <span className="mx-2">mm</span>
    </>
  )
}

export default TasksEstimatedInputs
