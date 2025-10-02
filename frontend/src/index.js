import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';
import customTheme from './theme'; // Correctly import your custom theme

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode> {/* Added React.StrictMode for best practices */}
    <BrowserRouter>
      <ChakraProvider theme={customTheme}> {/* Use 'theme' prop instead of 'value' */}
        <App />
      </ChakraProvider>
    </BrowserRouter>
  </React.StrictMode>
);
