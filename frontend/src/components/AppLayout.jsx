import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import CommandPalette from './CommandPalette';

export default function AppLayout() {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main">
        <Header onOpenCommandPalette={setCommandPaletteOpen} />
        <main className="app-content">
          <Outlet />
        </main>
      </div>

      {/* Global 21st.dev Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </div>
  );
}
