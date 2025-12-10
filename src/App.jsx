import React, { useState, useRef, useCallback } from 'react';
import { Menu, Brain, Sun, Moon, MoreVertical, X, Info } from 'lucide-react';
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
  const [sectionColorsEnabled, setSectionColorsEnabled] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [infoDismissed, setInfoDismissed] = useState(false);
  const brainMeshes = useRef([]);

  const handleBrainClick = useCallback((baName) => {
    if (baName === null) {
      // Deselect - close drawer and clear selection
      setDrawerOpen(false);
      setSelectedBA(null);
    } else {
      setSelectedBA((prev) => {
        if (prev === baName) {
          // Clicked same area - deselect
          setDrawerOpen(false);
          return null;
        } else {
          // New area selected
          setDrawerOpen(true);
          return baName;
        }
      });
    }
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
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Brain className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold">Brain Explorer</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Settings Menu */}
          <div className="relative">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
            
            {menuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-20" 
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-12 w-64 bg-card border-2 border-border rounded-lg shadow-xl z-30 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor="section-colors" className="text-sm font-semibold cursor-pointer flex-1">
                      Brain Section Colors
                    </label>
                    <button
                      id="section-colors"
                      role="switch"
                      aria-checked={sectionColorsEnabled}
                      onClick={() => setSectionColorsEnabled(!sectionColorsEnabled)}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-200 border-2 ${
                        sectionColorsEnabled 
                          ? darkMode ? 'bg-primary border-primary' : 'bg-gray-400 border-gray-300'
                          : 'bg-gray-500 border-gray-400'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                          sectionColorsEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {sectionColorsEnabled ? 'Showing colorful brain regions' : 'Showing natural brain appearance'}
                  </p>
                </div>
              </>
            )}
          </div>
          
          <Button variant="ghost" size="icon" onClick={toggleDarkMode}>
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Info Banner */}
        {!infoDismissed && meshesLoaded && (
          <div className="absolute top-0 left-0 right-0 z-30 bg-card/80 backdrop-blur-md border-b border-border shadow-lg">
            <div className="flex items-start gap-3 p-4 max-w-4xl mx-auto">
              <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-sm">
                <p className="font-semibold mb-1">How to use Brain Explorer:</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• <strong>Click/Tap</strong> a brain region to view details</li>
                  <li>• <strong>Drag</strong> to rotate the brain</li>
                  <li>• <strong>Scroll/Pinch</strong> to zoom in/out</li>
                  <li>• Click the <strong>hamburger menu</strong> to browse all Brodmann areas</li>
                  <li>• Use the <strong>⋮ menu</strong> to toggle section colors on/off</li>
                </ul>
              </div>
              <button
                onClick={() => setInfoDismissed(true)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Dismiss info"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* Loading Modal */}
        {!meshesLoaded && (
          <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center">
            <div className="bg-card rounded-lg p-8 shadow-2xl border border-border flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent"></div>
              <p className="text-lg font-semibold text-foreground">Loading Brain Model...</p>
            </div>
          </div>
        )}

        {/* Overlay Sidebar (shows on button click) */}
        {sidebarOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="fixed top-16 left-0 bottom-0 w-80 bg-card border-r border-border overflow-y-auto z-50 shadow-2xl">
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
          </>
        )}

        {/* 3D Brain Viewer - Always full width */}
        <main className="w-full h-full relative">
          <BrainViewer
            onBrainClick={handleBrainClick}
            selectedBA={selectedBA}
            brainMeshes={brainMeshes}
            darkMode={darkMode}
            sectionColorsEnabled={sectionColorsEnabled}
            onMeshesLoaded={() => setMeshesLoaded(true)}
          />
        </main>
      </div>

      {/* Bottom Drawer - Only show when valid BA is selected */}
      {drawerOpen && selectedBA && (
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
                Brodmann Area {selectedBA}
              </h3>
              <Button 
                variant="ghost" 
                onClick={() => {
                  setDrawerOpen(false);
                  setSelectedBA(null);
                }} 
                className="cursor-pointer"
              >
                Close
              </Button>
            </div>
            <div className="max-w-none">
              <p style={{ color: darkMode ? 'hsl(215 20.2% 65.1%)' : 'hsl(215.4 16.3% 46.9%)' }}>
                Detailed information about <strong>Brodmann Area {selectedBA}</strong> will appear here.
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

