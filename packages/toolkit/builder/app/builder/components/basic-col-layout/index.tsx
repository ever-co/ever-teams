export const ColContainer = ({ item, uid, children, ...props }:any) => {
    return (
      <div
        {...props}
        onClick={() => {
          console.log(`Container ${uid} clicked`);
        }}
        onMouseDown={() => {
          console.log(`Container ${uid} mouse down`);
        }}
        className="min-h-10 flex-grow overflow-hidden h-fit p-0.5 w-full border border-dashed border-gray-600 flex relative"
        id={item + 'no-drag'}
      >
        {children}
      </div>
    );
  };
  
  export  const ColLayout = ({ rows = 3 }) => {
    const array = Array.from({ length: rows }).map((_, i) => i);
    return (
      <div className="flex flex-grow">
        <div className="flex flex-col flex-grow p-1 border justify-between">
          {array.map((item, index) => (
            <ColContainer
              key={index}
              item={item}
              uid={index.toString()}  >
              <div></div>
              </ColContainer>
          ))}
        </div>
      </div>
    );
  };


