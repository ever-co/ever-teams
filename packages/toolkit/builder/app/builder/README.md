# Builder.io 

### What is Builder.io?

Builder.io is a powerful visual content management system (CMS) that allows you to create, manage, and optimize digital experiences without needing to write code. It provides a user-friendly drag-and-drop interface, enabling both developers and non-developers to build dynamic and responsive web pages and components easily. Builder.io seamlessly integrates with any tech stack, making it a versatile tool for various applications.

### Key Features

- **Drag-and-Drop Interface**: Build and edit web pages visually without writing code.
- **Custom Components**: Integrate and use your own React components within the Builder.io editor.
- **Responsive Design**: Create responsive designs that look great on all devices.
- **AB Testing**: Run AB tests and optimize content to improve performance.
- **Integration**: Works with any tech stack, including popular frameworks like React, Vue, Angular, and more.


### Example

Here is a basic example of how to register a component in Builder.io:

```jsx
import { Builder } from '@builder.io/react';

// Define your custom component
const TimerComponent = ({ initialTime }) => {
  const [time, setTime] = React.useState(initialTime);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setTime(prevTime => prevTime - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return <div>Time left: {time} seconds</div>;
};

// Register the component with Builder.io
Builder.registerComponent(TimerComponent, {
  name: 'TimerComponent',
  inputs: [
    { name: 'initialTime', type: 'number', defaultValue: 60 },
  ],
});
```

## Exception:

We are unable to find any best solution for our users to integrate our timer components in there app thought npm package/SDK. 

