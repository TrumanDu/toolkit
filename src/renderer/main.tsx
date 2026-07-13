import { createRoot } from 'react-dom/client';
import Dashboard from './Dashboard';

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);
root.render(<Dashboard />);
