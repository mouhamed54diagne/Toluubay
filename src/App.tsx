/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Weather from './components/Weather';
import Calendar from './components/Calendar';
import Chatbot from './components/Chatbot';
import Diagnostic from './components/Diagnostic';
import FieldLog from './components/FieldLog';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <Dashboard onNavigate={setActiveTab} />;
      case 'weather':
        return <Weather />;
      case 'calendar':
        return <Calendar />;
      case 'chat':
        return <Chatbot />;
      case 'diagnostic':
        return <Diagnostic />;
      case 'log':
        return <FieldLog />;
      default:
        return <Dashboard onNavigate={setActiveTab} />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}

