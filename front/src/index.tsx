import React from 'react';
import ReactDOM from 'react-dom/client';
import MainPage from './components/MainPage';
import "@cloudscape-design/global-styles/index.css"
import {BrowserRouter, Route, Routes} from "react-router-dom";
import NoPage from "./components/NoPage";
import ProjectView from "./components/ProjectView";
import App from "./App";


const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
    <App
    contractAddress={"5GWXEiZeb7wVxCJCHkDv3AgCtHFhvCsNDgeobAv3Nfox6xxP"}
    />
);

