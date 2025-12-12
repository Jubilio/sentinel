import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import { Icons } from "./constants";
import Dashboard from "./components/Dashboard";
import SecureUpload from "./components/SecureUpload";
import MatchReview from "./components/MatchReview";
import UrlScanner from "./components/UrlScanner";
import ArchitectureViewer from "./components/ArchitectureViewer";
import HashMonitor from "./components/HashMonitor";
import ResourceCenter from "./components/ResourceCenter";
import ReverseSearch from "./components/ReverseSearch";
import ContinuousMonitor from "./components/ContinuousMonitor";

const SidebarLink: React.FC<{
  to: string;
  icon: React.ReactNode;
  label: string;
}> = ({ to, icon, label }) => {
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <Link
      to={to}
      className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
        active
          ? "bg-brand-900/30 text-brand-400 border border-brand-800/50"
          : "text-slate-400 hover:text-white hover:bg-slate-800"
      }`}
    >
      <div className={`${active ? "text-brand-400" : "text-slate-500"}`}>
        {icon}
      </div>
      <span className="font-medium text-sm">{label}</span>
    </Link>
  );
};

const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col fixed h-full z-20 hidden md:flex">
        <div className="p-6 border-b border-slate-800 flex items-center space-x-2">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-brand-500/30">
            <Icons.Shield />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            Sentinel
          </span>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <SidebarLink to="/" icon={<Icons.Activity />} label="Dashboard" />
          <SidebarLink to="/vault" icon={<Icons.Lock />} label="Secure Vault" />
          <SidebarLink to="/report" icon={<Icons.Link />} label="Scan URL" />
          <SidebarLink
            to="/matches"
            icon={<Icons.Search />}
            label="Review Matches"
          />
          <SidebarLink
            to="/monitor"
            icon={<Icons.EyeOff />}
            label="Hash Monitor"
          />
          <SidebarLink
            to="/reverse-search"
            icon={<Icons.Globe />}
            label="Reverse Search"
          />
          <SidebarLink
            to="/continuous"
            icon={<Icons.Activity />}
            label="Auto Monitor"
          />
          <SidebarLink
            to="/resources"
            icon={<Icons.Alert />}
            label="Get Help"
          />
          <div className="pt-4 mt-4 border-t border-slate-800">
            <span className="px-4 text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              Engineering
            </span>
            <SidebarLink
              to="/architecture"
              icon={<Icons.Activity />}
              label="System Specs"
            />
          </div>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center space-x-3 px-4 py-2 bg-slate-850 rounded-lg border border-slate-700">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">
                Connection
              </span>
              <span className="text-xs text-white">TLS 1.3 Encrypted</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-x-hidden">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-brand-600 rounded flex items-center justify-center text-white">
              <Icons.Shield />
            </div>
            <span className="font-bold text-white">Sentinel</span>
          </div>
          <div className="text-xs text-brand-500 bg-brand-900/20 px-2 py-1 rounded">
            Secure Mode
          </div>
        </div>

        <Routes>
          <Route
            path="/"
            element={
              <div className="animate-fade-in">
                <header className="mb-8">
                  <h1 className="text-2xl font-bold text-white">
                    Security Overview
                  </h1>
                  <p className="text-slate-400 text-sm mt-1">
                    Real-time threat monitoring and asset protection status.
                  </p>
                </header>
                <Dashboard />
              </div>
            }
          />
          <Route
            path="/vault"
            element={
              <div className="animate-fade-in max-w-3xl mx-auto mt-8">
                <SecureUpload />

                <div className="mt-8 p-6 bg-slate-900/50 rounded-lg border border-slate-800">
                  <h4 className="text-sm font-semibold text-slate-300 mb-2">
                    Architectural Note
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    This module demonstrates the{" "}
                    <strong>Privacy by Design</strong> principle. Video
                    processing (keyframe extraction and hashing) occurs within
                    the browser (Client-Side) via WebAssembly. Only the
                    non-reversible unique fingerprint (hash) is sent to the
                    backend Vector Database (Milvus). The original content never
                    leaves the victim's device.
                  </p>
                </div>
              </div>
            }
          />
          <Route
            path="/report"
            element={
              <div className="animate-fade-in h-full">
                <UrlScanner />
              </div>
            }
          />
          <Route
            path="/matches"
            element={
              <div className="animate-fade-in h-full">
                <header className="mb-6">
                  <h1 className="text-2xl font-bold text-white">
                    Incident Response
                  </h1>
                  <p className="text-slate-400 text-sm mt-1">
                    Review detections and authorize legal takedowns.
                  </p>
                </header>
                <MatchReview />
              </div>
            }
          />
          <Route path="/architecture" element={<ArchitectureViewer />} />
          <Route
            path="/monitor"
            element={
              <div className="animate-fade-in h-full">
                <HashMonitor />
              </div>
            }
          />
          <Route
            path="/resources"
            element={
              <div className="animate-fade-in h-full">
                <ResourceCenter />
              </div>
            }
          />
          <Route
            path="/reverse-search"
            element={
              <div className="animate-fade-in h-full">
                <ReverseSearch />
              </div>
            }
          />
          <Route
            path="/continuous"
            element={
              <div className="animate-fade-in h-full">
                <ContinuousMonitor />
              </div>
            }
          />
        </Routes>
      </main>

      {/* Mobile Nav (Bottom) */}
      <nav className="md:hidden fixed bottom-0 w-full bg-slate-900 border-t border-slate-800 flex justify-around p-3 z-50">
        <Link to="/" className="p-2 text-slate-400 hover:text-white">
          <Icons.Activity />
        </Link>
        <Link to="/vault" className="p-2 text-slate-400 hover:text-white">
          <Icons.Lock />
        </Link>
        <Link to="/matches" className="p-2 text-slate-400 hover:text-white">
          <Icons.Search />
        </Link>
        <Link to="/resources" className="p-2 text-slate-400 hover:text-white">
          <Icons.Alert />
        </Link>
      </nav>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <Layout />
    </Router>
  );
};

export default App;
