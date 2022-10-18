import React from "react"

import Header from "~components/popup/Header"
import Tasks from "~components/popup/Tasks"
import Timer from "~components/popup/Timer"

import "./style.css"

function IndexPopup() {
  return (
    <div className="flex flex-col p-4" style={{ width: "400px" }}>
      <Header />
      <Tasks />
      <Timer />
    </div>
  )
}

export default IndexPopup
