import React, { useState, useRef, useCallback } from 'react';
import { Menu, Brain, Sun, Moon } from 'lucide-react';
import { Button } from './components/ui/button';
import { Sheet, SheetContent } from './components/ui/sheet';
import { Drawer, DrawerContent } from './components/ui/drawer';
import BrainViewer from './components/BrainViewer';
import './index.css';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedBA, setSelectedBA] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [meshesLoaded, setMeshesLoaded] = useState(false);
  const brainMeshes = useRef([]);

  const handleBrainClick = useCallback((baName) => {
    setSelectedBA((prev) => {
      if (prev === baName) {
        setDrawerOpen(false);
        return null;
      } else {
        setDrawerOpen(true);
        return baName;
      }
    });
  }, []);

  const handleSidebarBAClick = useCallback((baName) => {
    setSelectedBA((prev) => {
      if (prev === baName) {
        setDrawerOpen(false);
        return null;
      } else {
        setDrawerOpen(true);
        return baName;
      }
    });
    setSidebarOpen(false);
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  React.useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col">
      {/* Top Navbar */}
      <nav className="h-16 bg-card border-b border-border flex items-center justify-between px-4 z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Brain className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold">Brain Explorer</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={toggleDarkMode}>
          {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </nav>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 bg-card border-r border-border overflow-y-auto">
          <div className="p-4">
            <h2 className="font-semibold mb-3 text-sm text-muted-foreground">BRODMANN AREAS</h2>
            <div className="space-y-2">
              {meshesLoaded && brainMeshes.current.map((item) => (
                <button
                  key={item.name}
                  onClick={() => handleSidebarBAClick(item.name)}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition-all border cursor-pointer ${
                    selectedBA === item.name
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-background border-border hover:bg-accent hover:border-accent-foreground/20 hover:shadow-sm'
                  }`}
                >
                  Brodmann Area {item.name || 'Unknown'}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar */}
        {sidebarOpen && (
          <Sheet>
            <SheetContent side="left" className="w-64">
              <div className="mt-8">
                <h2 className="font-semibold mb-3 text-sm text-muted-foreground">BRODMANN AREAS</h2>
                <div className="space-y-2">
                  {meshesLoaded && brainMeshes.current.map((item) => (
                    <button
                      key={item.name}
                      onClick={() => handleSidebarBAClick(item.name)}
                      className={`w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition-all border cursor-pointer ${
                        selectedBA === item.name
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'bg-background border-border hover:bg-accent hover:border-accent-foreground/20 hover:shadow-sm'
                      }`}
                    >
                      Brodmann Area {item.name || 'Unknown'}
                    </button>
                  ))}
                </div>
              </div>
            </SheetContent>
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => setSidebarOpen(false)}
            />
          </Sheet>
        )}

        {/* 3D Brain Viewer */}
        <main className="flex-1 relative">
          <BrainViewer
            onBrainClick={handleBrainClick}
            selectedBA={selectedBA}
            brainMeshes={brainMeshes}
            darkMode={darkMode}
            onMeshesLoaded={() => setMeshesLoaded(true)}
          />
        </main>
      </div>

      {/* Bottom Drawer - Non-blocking with animation */}
      {drawerOpen && (
        <div 
          className="fixed bottom-0 inset-x-0 z-50 max-h-[50vh] bg-card text-foreground border-t border-border shadow-2xl overflow-y-auto animate-slide-up"
          style={{
            backgroundColor: darkMode ? 'hsl(222.2 84% 4.9%)' : 'hsl(0 0% 100%)',
            color: darkMode ? 'hsl(210 40% 98%)' : 'hsl(222.2 84% 4.9%)'
          }}
        >
          <div className="p-6 w-full max-w-3xl mx-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-2xl font-bold" style={{ color: darkMode ? 'hsl(210 40% 98%)' : 'hsl(222.2 84% 4.9%)' }}>
                {selectedBA || 'Unknown Region'}
              </h3>
              <Button variant="ghost" onClick={() => setDrawerOpen(false)} className="cursor-pointer">
                Close
              </Button>
            </div>
            <div className="max-w-none">
              <p style={{ color: darkMode ? 'hsl(215 20.2% 65.1%)' : 'hsl(215.4 16.3% 46.9%)' }}>
                Detailed information about <strong>{selectedBA}</strong> will appear here.
                This is a placeholder for region descriptions, functions, and related research.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

