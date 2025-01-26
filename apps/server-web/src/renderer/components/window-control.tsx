

const close = () => {
  // close app
}

const minimize = () => {
  //  minimize app
}
const WindowControl = () => {
  return (
    <div className="absolute top-1.5 left-1.5 p-2 flex space-x-2 z-50 bg-transparent w-full drag-region" style={{zIndex: '99999'}}>
      <button
        onClick={close}
        className="w-4 h-4 bg-red-400 text-white border-none text-xs font-semibold hover:bg-red-600 rounded-md focus:outline-none no-drag"
      >
        x
      </button>
      <button
        onClick={minimize}
        className="w-4 h-4 bg-gray-400 text-white border-none text-xs font-semibold hover:bg-gray-700 rounded-md focus:outline-none no-drag"
      >
        -
      </button>
    </div>
  )
}

export default WindowControl;

