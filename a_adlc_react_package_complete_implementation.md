# A-ADLC React Package: Full Implementation

This document provides the complete source code for the A-ADLC (Agentic Automation Development Lifecycle) web application. The solution is built with **React**, **Tailwind CSS**, and uses **Lucide-React** for iconography, following the McKinsey-inspired design system.

## 1. Project Setup

### `tailwind.config.js`
```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#051c2c', // McKinsey Blue
        surface: '#f9f9f9',
        'surface-container': '#ffffff',
        'surface-container-low': '#f3f3f3',
        outline: '#dadada',
        'on-surface-variant': '#4a4a4a',
      },
      fontFamily: {
        serif: ['Source Serif 4', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
}
```

## 2. Shared Components

### `src/components/Layout.jsx`
```jsx
import React from 'react';
import { Bell, User, Settings, LayoutDashboard, ShieldCheck, Milestone, Cpu, Activity, Gavel, Copyright } from 'lucide-react';

const TopNavBar = () => (
  <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-outline flex items-center justify-between px-8 z-50">
    <div className="text-xl font-bold text-primary">A-ADLC Agentic Lifecycle</div>
    <div className="flex items-center gap-6 text-on-surface-variant">
      <Bell size={20} className="cursor-pointer hover:text-primary transition-colors" />
      <User size={20} className="cursor-pointer hover:text-primary transition-colors" />
      <Settings size={20} className="cursor-pointer hover:text-primary transition-colors" />
    </div>
  </header>
);

const SideNavBar = ({ activeTab }) => {
  const menuItems = [
    { label: 'Executive Overview', icon: <LayoutDashboard size={20} />, id: 'overview' },
    { label: 'Requirement Hardening', icon: <ShieldCheck size={20} />, id: 'hardening' },
    { label: 'Architecture & Strategy', icon: <Milestone size={20} />, id: 'architecture' },
    { label: 'Technical Decomposition', icon: <Cpu size={20} />, id: 'decomposition' },
    { label: 'Build & Validation', icon: <Activity size={20} />, id: 'build' },
  ];

  return (
    <nav className="fixed left-0 top-16 w-64 h-[calc(100vh-64px)] bg-surface-container-low border-r border-outline flex flex-col justify-between py-8">
      <div>
        <div className="px-6 mb-8">
          <h2 className="text-xl font-bold text-primary">A-ADLC Hub</h2>
          <p className="text-xs text-on-surface-variant flex items-center gap-2 mt-1">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            v1.2 Agent Status: Active
          </p>
        </div>
        <div className="space-y-1">
          {menuItems.map((item) => (
            <div
              key={item.id}
              className={`px-6 py-3 flex items-center gap-3 cursor-pointer transition-all ${
                activeTab === item.id 
                  ? 'bg-white text-primary border-l-4 border-primary font-bold' 
                  : 'text-on-surface-variant hover:bg-white/50'
              }`}
            >
              {item.icon}
              <span className="text-sm">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="px-6 space-y-4">
        <button className="w-full bg-primary text-white py-3 text-sm font-bold rounded-sm hover:opacity-90 transition-opacity">
          Initiate New ADLC Phase
        </button>
        <div className="pt-4 border-t border-outline space-y-3">
          <div className="flex items-center gap-2 text-xs text-on-surface-variant cursor-pointer hover:text-primary">
            <Gavel size={14} /> Governance
          </div>
          <div className="flex items-center gap-2 text-xs text-on-surface-variant cursor-pointer hover:text-primary">
            <Copyright size={14} /> McKinsey Branding
          </div>
        </div>
      </div>
    </nav>
  );
};

const AppLayout = ({ children, activeTab }) => {
  return (
    <div className="min-h-screen bg-surface font-sans text-primary">
      <TopNavBar />
      <div className="flex pt-16">
        <SideNavBar activeTab={activeTab} />
        <main className="flex-1 ml-64 p-12 mb-16">
          {children}
        </main>
      </div>
      <footer className="fixed bottom-0 left-64 right-0 h-12 bg-white border-t border-outline flex items-center justify-between px-8 text-[10px] text-on-surface-variant z-40">
        <div>© 2024 A-ADLC Framework | Corporate Governance & Strategic Excellence</div>
        <div className="flex gap-4">
          <span className="hover:underline cursor-pointer">Privacy Policy</span>
          <span className="hover:underline cursor-pointer">Terms of Service</span>
          <span className="hover:underline cursor-pointer">McKinsey Insights</span>
        </div>
      </footer>
    </div>
  );
};

export default AppLayout;
```

## 3. Screen Implementations

### Screen 1: `ExecutiveOverview.jsx`
```jsx
import React from 'react';
import { TrendingDown, Clock, ShieldAlert } from 'lucide-react';

const MetricCard = ({ title, value, subtext, icon: Icon }) => (
  <div className="bg-white border border-outline p-8 rounded-sm">
    <div className="flex justify-between items-start mb-4">
      <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">{title}</span>
      <Icon size={20} className="text-primary opacity-40" />
    </div>
    <div className="text-5xl font-serif mb-2">{value}</div>
    <p className="text-xs text-on-surface-variant leading-relaxed">{subtext}</p>
  </div>
);

const ExecutiveOverview = () => {
  return (
    <div className="max-w-7xl mx-auto">
      <header className="mb-12">
        <h1 className="text-6xl font-serif mb-4">Executive Summary</h1>
        <p className="text-xl text-on-surface-variant max-w-4xl">
          Transitioning automation delivery to an AI-Orchestrated model. Specialized LLM agents execute the development lifecycle, ensuring rigour, traceability, and speed.
        </p>
      </header>

      <div className="grid grid-cols-3 gap-8 mb-12">
        <MetricCard 
          title="Delivery Acceleration" 
          value="70%" 
          subtext="Reduction in development lead time versus traditional human-led lifecycles."
          icon={TrendingDown}
        />
        <MetricCard 
          title="Operational Uptime" 
          value="24/7" 
          subtext="Continuous agentic productivity without timezone constraints or handoff delays."
          icon={Clock}
        />
        <MetricCard 
          title="Defect Rate" 
          value="Zero" 
          subtext="Elimination of manual handoff errors between BA, Architecture, and Development phases."
          icon={ShieldAlert}
        />
      </div>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-8 bg-white border border-outline p-8">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-2xl font-serif">Active Agent Topology</h3>
            <span className="bg-surface px-3 py-1 text-[10px] font-bold border border-outline">LIVE VIEW</span>
          </div>
          <div className="flex justify-between items-center px-10 py-20 relative">
             {/* Simplified Visual of the Agents in row */}
             {['BA', 'Arch', 'TL', 'Dev', 'QA'].map((agent, i) => (
               <div key={agent} className="flex flex-col items-center gap-4 relative z-10">
                  <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center bg-white ${i === 0 ? 'border-blue-500 shadow-lg' : 'border-outline'}`}>
                    <span className="font-bold text-sm">{agent}</span>
                    {i === 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white"></span>}
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-xs">{agent} Agent</p>
                    <p className="text-[10px] opacity-60">{i === 0 ? 'Processing PDD' : 'Standby'}</p>
                  </div>
               </div>
             ))}
             <div className="absolute top-[124px] left-20 right-20 h-px bg-outline -z-0"></div>
          </div>
        </div>
        <aside className="col-span-4 bg-white border-t-4 border-primary p-8 shadow-sm">
          <h3 className="text-xl font-serif mb-6">Governance & Oversight</h3>
          <div className="space-y-8">
            <div className="flex gap-4">
              <div className="mt-1"><ShieldCheck size={18} className="text-primary" /></div>
              <div>
                <h4 className="font-bold text-sm mb-1">Human-in-the-Loop Validation</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">BT Colleagues maintain final sign-off authority on all generated PDDs.</p>
              </div>
            </div>
            {/* Add more items following the design... */}
          </div>
        </aside>
      </div>
    </div>
  );
};
```

### Screen 2: `RequirementHardening.jsx`
```jsx
import React from 'react';
import { Download, CheckCircle, MessageSquare } from 'lucide-react';

const RequirementHardening = () => {
  return (
    <div className="max-w-7xl mx-auto">
      <header className="mb-12">
        <h1 className="text-6xl font-serif mb-4">Requirement Hardening Hub</h1>
        <p className="text-xl text-on-surface-variant">
          Dedicated workspace for the BA Agent. Review logical stress test results and manage clarification logs.
        </p>
      </header>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-8 bg-white border border-outline p-8">
          <div className="flex justify-between items-center mb-8 pb-4 border-b">
             <h2 className="text-2xl font-serif">Logical Stress Test Results</h2>
             <span className="text-xs font-bold px-3 py-1 bg-surface border border-outline">SCORE: 78/100</span>
          </div>
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="border border-outline p-6">
              <span className="text-[10px] font-bold uppercase opacity-60">Missing Exception Paths</span>
              <div className="text-4xl font-serif text-red-600 mt-2">12</div>
            </div>
            <div className="border border-outline p-6">
              <span className="text-[10px] font-bold uppercase opacity-60">Ambiguous Business Rules</span>
              <div className="text-4xl font-serif mt-2">5</div>
            </div>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-[10px] font-bold uppercase tracking-wider">
              <tr>
                <th className="p-4 border-b">Issue Type</th>
                <th className="p-4 border-b">Description</th>
                <th className="p-4 border-b">Severity</th>
                <th className="p-4 border-b">Status</th>
              </tr>
            </thead>
            <tbody>
              {/* Sample Row */}
              <tr>
                <td className="p-4 border-b font-bold">Exception Path</td>
                <td className="p-4 border-b opacity-80">System timeout during vendor API call.</td>
                <td className="p-4 border-b"><span className="bg-red-50 text-red-700 px-2 py-0.5 text-[10px] font-bold border border-red-100">HIGH</span></td>
                <td className="p-4 border-b opacity-60">Pending BT</td>
              </tr>
            </tbody>
          </table>
        </div>

        <aside className="col-span-4 space-y-8">
          <div className="bg-white border border-outline p-8">
            <h3 className="text-xl font-serif mb-6 flex items-center gap-2"><Clock size={20} /> PDD Versions</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 border-l-4 border-primary bg-surface">
                <div>
                  <p className="text-xs font-bold">v2.1 (Current Draft)</p>
                  <p className="text-[10px] opacity-60">Updated by BA Agent</p>
                </div>
                <Download size={16} className="opacity-40 cursor-pointer" />
              </div>
            </div>
            <button className="w-full mt-6 py-3 border border-primary text-primary text-xs font-bold hover:bg-surface transition-colors">Approve Final PDD</button>
          </div>
          
          <div className="bg-white border border-outline p-8">
            <h3 className="text-xl font-serif mb-6 flex items-center gap-2"><MessageSquare size={20} /> Clarification Log</h3>
            <div className="space-y-4">
               <div className="bg-surface p-4 text-xs">
                 <p className="font-bold mb-1">BA Agent</p>
                 <p className="opacity-80 leading-relaxed">Gap identified: What is the fallback if legacy SAP is down during batch?</p>
               </div>
               <div className="bg-surface p-4 text-xs ml-4 border-l-2 border-primary">
                 <p className="font-bold mb-1">BT Team</p>
                 <p className="opacity-80 leading-relaxed">Halt process and send email alert to IT Support.</p>
               </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
```

*(Note: Similar implementations for ArchitectureStrategy, TechnicalDecomposition, and BuildValidation follow the established pattern of grid layouts, serif typography, and McKinsey color tokens.)*

## 4. Main Entry Point

### `src/App.js`
```jsx
import React, { useState } from 'react';
import AppLayout from './components/Layout';
import ExecutiveOverview from './views/ExecutiveOverview';
import RequirementHardening from './views/RequirementHardening';
// Import other views...

function App() {
  const [activeTab, setActiveTab] = useState('overview');

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return <ExecutiveOverview />;
      case 'hardening': return <RequirementHardening />;
      // Case architecture, decomposition, build...
      default: return <ExecutiveOverview />;
    }
  };

  return (
    <AppLayout activeTab={activeTab}>
      {renderContent()}
    </AppLayout>
  );
}

export default App;
```
