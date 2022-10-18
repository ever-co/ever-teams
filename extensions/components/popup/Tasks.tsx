import classNames from "classnames"
import React, { useState } from "react"

import AppDropdown from "~components/shared/AppDropdown"
import { roundInput, textEllipsis } from "~misc/tailwindClasses"
import type { Task } from "~typescript/types/Task"

import TasksEstimatedInputs from "./TasksEstimatedInputs"

const fakeTasks = [
  { id: 1, title: "Build a chrome extension for Gauzy Teams" },
  { id: 2, title: "Fix bug #2" }
]
const defaultTask = { id: 0, title: "Select a task" }

const Tasks = () => {
  const [tasks, setTasks] = useState<Task[]>(fakeTasks)
  const [selectedTask, setSelectedTask] = useState<Task>(defaultTask)
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const onActiveTaskChange = (event) => {
    setActiveTask(event.target.value)
    setSelectedTask(defaultTask)
  }

  const onTaskSelect = (task: Task) => {
    setSelectedTask(task)
    setActiveTask(task)
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
            value={activeTask.title}
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
