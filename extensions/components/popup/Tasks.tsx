import classNames from "classnames"
import React, { useState } from "react"

import AppDropdown from "~components/shared/AppDropdown"
import { roundInput, textEllipsis } from "~misc/tailwindClasses"

import TasksEstimatedInputs from "./TasksEstimatedInputs"

const fakeTasks = ["Build a chrome extension for Gauzy Teams", "Fix bug #2"]
const defaultTask = "Select a task"

const Tasks = () => {
  const [tasks, setTasks] = useState<string[]>(fakeTasks)
  const [selectedTask, setSelectedTask] = useState<string>(defaultTask)
  const [activeTask, setActiveTask] = useState<string>("")

  const onActiveTaskChange = (event) => {
    setActiveTask(event.target.value)
    setSelectedTask(defaultTask)
  }

  const onTaskSelect = (name: string) => {
    setSelectedTask(name)
    setActiveTask(name)
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
            <AppDropdown
              buttonClassNames={classNames(
                roundInput,
                textEllipsis,
                "min-w-[207px] max-w-[207px] text-start"
              )}
              buttonTitle={selectedTask}
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
            value={activeTask}
            onChange={onActiveTaskChange}
          />
        </div>
      </div>
      <div className="flex items-center">
        <TasksEstimatedInputs />
        {isNewTask && (
          <button
            className="ml-2 bg-slate-900 text-white rounded p-2"
            onClick={addNewTask}>
            Add Task
          </button>
        )}
      </div>
    </div>
  )
}

export default Tasks
