import { BrowserRouter, Routes, Route } from "react-router-dom";

import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Goals from "./pages/Goals";
import Tasks from "./pages/Tasks";
import Projects from "./pages/Projects";
import Analytics from "./pages/Analytics";

export default function App() {
  return (
    <BrowserRouter>
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/analytics" element={<Analytics />} />
      </Routes>
      </Layout>
    </BrowserRouter>
  );
}
