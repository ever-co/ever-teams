import { IPC_TYPES } from "../../main/helpers/constant"
import { IWindowTypes } from "../../main/helpers/interfaces"


const close = (windowTypes: IWindowTypes) => {
  // close app
  window.electron.ipcRenderer.sendMessage(IPC_TYPES.CONTROL_BUTTON, {
    type: 'close',
    windowTypes: windowTypes
  })
}

const minimize = (windowTypes: IWindowTypes) => {
  //  minimize app
  window.electron.ipcRenderer.sendMessage(IPC_TYPES.CONTROL_BUTTON, {
    type: 'minimize',
    windowTypes: windowTypes
  })
}
const WindowControl = ({ windowTypes }: {
  windowTypes: IWindowTypes
}) => {
  return (
    <div className="absolute top-1.5 left-1.5 p-2 flex space-x-2 z-50 bg-transparent w-full drag-region" style={{zIndex: '99999'}}>
      <button
        onClick={() => {
          close(windowTypes)
        }}
        className="w-4 h-4 bg-red-400 text-white border-none text-xs font-semibold hover:bg-red-600 rounded-md focus:outline-none no-drag"
      >
        x
      </button>
      <button
        onClick={() => {
          minimize(windowTypes);
        }}
        className="w-4 h-4 bg-gray-400 text-white border-none text-xs font-semibold hover:bg-gray-700 rounded-md focus:outline-none no-drag"
      >
        -
      </button>
    </div>
  )
}

export default WindowControl;

