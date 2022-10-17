import classNames from "classnames"
import { useState } from "react"

import { tailwindInputClass } from "~popup"

const tailwindInputUnderline = `bg-transparent 
border-0 border-grey-300 border-b-2 
outline-none
focus:ring-0 p-0 pl-[0.2rem]`

const fakeTasks = ["Build a chrome extension for Gauzy Teams", "Fix bug #2"]
const defaultTask = "Select a task"

const Tasks = () => {
  const [dropdownHidden, setHidden] = useState<boolean>(true)

  const [tasks, setTasks] = useState<string[]>(fakeTasks)
  const [selectedTask, setSelectedTask] = useState<string>(defaultTask)
  const [activeTask, setActiveTask] = useState<string>("")

  const [hoursEst, setHoursEstimate] = useState<string>("")
  const [minutesEst, setMinutesEstimate] = useState<string>("")

  const onActiveTaskChange = (event) => {
    setActiveTask(event.target.value)
    setSelectedTask(defaultTask)
  }

  const onTaskSelect = (name: string) => {
    setSelectedTask(name)
    setActiveTask(name)
    setHidden(true)
  }

  const taskOptions = tasks.map((name) => {
    return (
      <li key={name} onClick={() => onTaskSelect(name)}>
        <a
          href="#"
          className="block py-2 px-4 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">
          {name}
        </a>
      </li>
    )
  })

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

  const onNumberBlur = () => {
    if (+hoursEst < 10 && hoursEst[0] !== "0") {
      const formatEstimate = "0" + hoursEst
      setHoursEstimate(formatEstimate)
    } else if (+minutesEst < 10 && minutesEst[0] !== "0") {
      const formatEstimate = "0" + minutesEst
      setMinutesEstimate(formatEstimate)
    }
  }

  const addNewTask = () => {
    const newTasks = [...tasks, activeTask]
    setTasks(newTasks)
    setSelectedTask(activeTask)
  }

  const isNewTask = !!activeTask && selectedTask === defaultTask

  return (
    <div className="bg-zinc-100 rounded p-2">
      <div className="flex flex-col mb-2">
        <div className="flex items-center border-b-2 pb-2 mb-2">
          <span className="w-24">All Tasks:</span>
          <div className="relative">
            <button
              id="dropdownDefault"
              data-dropdown-toggle="dropdown"
              className={classNames(
                tailwindInputClass,
                "min-w-[207px] max-w-[207px] overflow-hidden whitespace-nowrap text-ellipsis text-start"
              )}
              type="button"
              onClick={() => setHidden((prev) => !prev)}>
              <span className="w-24">{selectedTask}</span>
            </button>
            <div
              id="dropdown"
              className={classNames(
                "scrollbar absolute overflow-auto max-h-64 mt-1.5 z-10 w-44 bg-white rounded divide-y divide-gray-100 shadow dark:bg-gray-700",
                dropdownHidden && "hidden"
              )}>
              <ul
                className="py-1 text-sm text-gray-700 dark:text-gray-200"
                aria-labelledby="dropdownDefault">
                {taskOptions}
              </ul>
            </div>
          </div>
        </div>
        <div className="flex items-center">
          <span className="w-24">Active Task:</span>
          <input
            type="text"
            className={tailwindInputClass}
            placeholder="ex. Gauzy Teams Extension"
            value={activeTask}
            onChange={onActiveTaskChange}
          />
        </div>
      </div>
      <div>
        <div className="flex items-center">
          <span className="w-24">Estimated: </span>
          <input
            className={classNames(tailwindInputUnderline, "w-8")}
            type="number"
            placeholder="00"
            value={hoursEst}
            onChange={onHoursChange}
            onBlur={onNumberBlur}
          />
          <span className="mx-2">hh</span>
          <input
            className={classNames(tailwindInputUnderline, "w-6")}
            type="number"
            placeholder="00"
            value={minutesEst}
            onChange={onMinuteChange}
            onBlur={onNumberBlur}
          />
          <span className="mx-2">mm</span>
          {isNewTask && (
            <button
              className="ml-2 bg-slate-900 text-white rounded p-2"
              onClick={addNewTask}>
              Add Task
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default Tasks
