import React, { useState } from 'react';
import './index.css';
import { Home } from './views/Home';
import { Navbar } from './components/Navbar';
import { SlideSyncTool } from './tools/SlideSync/SlideSyncTool';
import { AudioTrimTool } from './tools/AudioTrim/AudioTrimTool';
import { VideoverlayTool } from './tools/Videoverlay/VideoverlayTool';
import { PhotoverlayTool } from './tools/Photoverlay/PhotoverlayTool';
import { PiCollageTool } from './tools/PiCollage/PiCollageTool';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';

export type ToolId =
  | 'home'
  | 'slidesync'
  | 'photoverlay'
  | 'audiotrim'
  | 'videoverlay'
  | 'picollage';

const AppContent: React.FC = () => {
  const [activeTool, setActiveTool] = useState<ToolId>('home');

  const renderTool = () => {
    switch (activeTool) {
      case 'slidesync':
        return <SlideSyncTool />;
      case 'audiotrim':
        return <AudioTrimTool />;
      case 'videoverlay':
        return <VideoverlayTool />;
      case 'photoverlay':
        return <PhotoverlayTool />;
      case 'picollage':
        return <PiCollageTool />;
      default:
        return <Home onSelectTool={setActiveTool} />;
    }
  };

  const { t } = useLanguage();

  const getToolName = () => {
    switch (activeTool) {
      case 'slidesync':
        return t.tools.slidesync.title;
      case 'audiotrim':
        return t.tools.audiotrim.title;
      case 'videoverlay':
        return t.tools.videoverlay.title;
      case 'photoverlay':
        return t.tools.photoverlay.title;
      case 'picollage':
        return t.tools.picollage.title;
      default:
        return '';
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-100 overflow-hidden">
      {activeTool !== 'home' && (
        <Navbar toolName={getToolName()} onBack={() => setActiveTool('home')} toolId={activeTool} />
      )}
      <main className="flex-1 overflow-hidden">{renderTool()}</main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
};

export default App;
