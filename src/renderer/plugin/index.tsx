import { createRoot } from 'react-dom/client';

function Plugin() {
  return <div>plugin window</div>;
}

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);
root.render(<Plugin />);
