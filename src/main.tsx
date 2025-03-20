
import { createRoot } from 'react-dom/client'
import { StrictMode } from 'react';
import App from './App.tsx'
import './index.css'

const rootElement = document.getElementById("root");

if (!rootElement) {
  console.error("Failed to find the root element");
  document.body.innerHTML = '<div>Failed to load application. Missing root element.</div>';
} else {
  const root = createRoot(rootElement);
  
  // Error boundary for entire app
  try {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  } catch (error) {
    console.error("Failed to render the application:", error);
    root.render(
      <div className="p-4 text-red-500">
        <h1 className="text-xl font-bold">Application Error</h1>
        <p>Failed to start the application. Please check the console for details.</p>
        <pre className="mt-4 p-2 bg-gray-100 rounded overflow-auto">
          {error instanceof Error ? error.message : String(error)}
        </pre>
      </div>
    );
  }
}
