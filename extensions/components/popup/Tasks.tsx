import classNames from "classnames"
import React, { useState } from "react"

import AppDropdown from "~components/shared/AppDropdown"
import { roundInput, textEllipsis } from "~misc/tailwindClasses"
import type { ITask } from "~typescript/types/ITask"

import TasksEstimatedInputs from "./TasksEstimatedInputs"

const fakeTasks: ITask[] = [
  {
    id: 1,
    title: "Build a chrome extension for Gauzy Teams",
    estimated: "12:00"
  },
  { id: 2, title: "Fix bug #2", estimated: "00:25" }
]

const defaultTask = { id: 0, title: "Select a task", estimated: ":" }

const Tasks = () => {
  const [tasks, setTasks] = useState<ITask[]>(fakeTasks)
  const [selectedTask, setSelectedTask] = useState<ITask>(defaultTask)
  const [activeTaskTitle, setActiveTaskTitle] = useState<string>("")
  const [activeTaskEstimate, setActiveTaskEstimate] = useState<string>("")

  const onTaskSelect = (task: ITask) => {
    setActiveTaskTitle(task.title)
    setSelectedTask(task)
  }

  const onActiveTaskChange = (event) => {
    setActiveTaskTitle(event.target.value)
    setSelectedTask(defaultTask)
  }

  const onActiveEstimateChange = (
    hoursEstimate: string,
    minutesEstimate: string
  ) => {
    const hours = hoursEstimate ? hoursEstimate : "00"
    const mins = minutesEstimate ? minutesEstimate : "00"
    const newEstimate = `${hours}:${mins}`
    setActiveTaskEstimate(newEstimate)
  }

  const addNewTask = () => {
    if (isEmptyEstimate()) return

    const newId = tasks[tasks.length - 1].id + 1
    const newTask = {
      id: newId,
      title: activeTaskTitle,
      estimated: activeTaskEstimate
    }
    const newTasks = [...tasks, newTask]
    setTasks(newTasks)
    setSelectedTask(newTask)
    setActiveTaskEstimate("")
  }

  const isNewTask = !!activeTaskTitle && selectedTask === defaultTask
  const isEmptyEstimate = () =>
    activeTaskEstimate === "00:00" || activeTaskEstimate === ""

  return (
    <div className="bg-zinc-100 rounded p-2">
      <div className="flex flex-col mb-2">
        <div className="flex items-center border-b-2 pb-2 mb-2">
          <span className="w-24">All Tasks:</span>
          <div className="relative">
            <AppDropdown
              buttonClassNames={classNames(
                roundInput,
                textEllipsis,
                "min-w-[207px] max-w-[207px] text-start"
              )}
              buttonTitle={selectedTask.title}
              options={tasks}
              onOptionSelect={onTaskSelect}
              optionContainerClassNames="min-w-[207px] max-w-[207px]"
            />
          </div>
        </div>
        <div className="flex items-center">
          <span className="w-24">Active Task:</span>
          <input
            type="text"
            className={roundInput}
            placeholder="ex. Gauzy Teams Extension"
            value={activeTaskTitle}
            onChange={onActiveTaskChange}
          />
        </div>
      </div>
      <div className="flex items-center">
        <TasksEstimatedInputs
          task={selectedTask}
          onEstimateChange={onActiveEstimateChange}
        />
        {isNewTask && (
          <button
            className={classNames(
              "ml-2 bg-slate-900 text-white rounded p-2",
              isEmptyEstimate() && "bg-slate-600"
            )}
            onClick={addNewTask}>
            Add Task
          </button>
        )}
      </div>
    </div>
  )
}

export default Tasks
