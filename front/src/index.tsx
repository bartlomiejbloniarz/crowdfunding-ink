import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import "@cloudscape-design/global-styles/index.css"
import {BrowserRouter, Route, Routes} from "react-router-dom";
import NoPage from "./components/NoPage";


const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
    <BrowserRouter>
        <Routes>
            <Route path="/">
                <Route index element={<App/>}/>
                <Route path="*" element={<NoPage />} />
            </Route>
        </Routes>
    </BrowserRouter>
);

