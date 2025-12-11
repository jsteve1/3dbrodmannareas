import React, { useState, useRef, useCallback } from 'react';
import { Menu, Brain, Sun, Moon, MoreVertical, X, Info } from 'lucide-react';
import { Button } from './components/ui/button';
import { Sheet, SheetContent } from './components/ui/sheet';
import { Drawer, DrawerContent } from './components/ui/drawer';
import BrainViewer from './components/BrainViewer';
import brainData from '../braininfo.json';
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
  const [drawerHeight, setDrawerHeight] = useState(35); // Percentage of viewport height
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startHeight, setStartHeight] = useState(50);
  const brainMeshes = useRef([]);

  // Helper function to find Brodmann area data from JSON
  const getBrodmannAreaData = useCallback((meshName) => {
    if (!meshName) return null;
    
    // Check for subcortical structures first (cerebellum and brainstem)
    // Note: mesh names are "Lobe_Cerebllum_2_0" (cerebellum) and "Lobe_Cerebllum_1_0" (brainstem)
    if (meshName.includes('Cerebllum')) {
      if (meshName.includes('_2_')) {
        // Lobe_Cerebllum_2_0 is the cerebellum
        return brainData.subcortical_structures?.find(s => s.id === 'cerebellum');
      } else if (meshName.includes('_1_')) {
        // Lobe_Cerebllum_1_0 is the brainstem
        return brainData.subcortical_structures?.find(s => s.id === 'brainstem');
      }
    }
    
    // Extract the number from the mesh name (e.g., "1", "4", "17", etc.)
    const match = meshName.match(/\d+/);
    if (!match) return null;
    
    const number = match[0];
    
    // Try exact match first
    let area = brainData.brodmann_areas.find(ba => ba.id === number);
    
    // If not found, try to find as part of a range (e.g., "1-3")
    if (!area) {
      area = brainData.brodmann_areas.find(ba => {
        if (ba.id.includes('-')) {
          const [start, end] = ba.id.split('-').map(n => parseInt(n));
          const num = parseInt(number);
          return num >= start && num <= end;
        }
        return false;
      });
    }
    
    return area;
  }, []);

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
          setDrawerHeight(35); // Reset to default height
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
        setDrawerHeight(35); // Reset to default height
        return baName;
      }
    });
    setSidebarOpen(false);
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  // Drawer drag handlers
  const handleMouseDown = useCallback((e) => {
    setIsDragging(true);
    setStartY(e.clientY);
    setStartHeight(drawerHeight);
    e.preventDefault();
  }, [drawerHeight]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;

    const deltaY = startY - e.clientY;
    const newHeight = Math.max(20, Math.min(80, startHeight + (deltaY / window.innerHeight) * 100));

    if (newHeight < 25) {
      // Close drawer if dragged down too far
      setDrawerOpen(false);
      setSelectedBA(null);
      setIsDragging(false);
    } else {
      setDrawerHeight(newHeight);
    }
  }, [isDragging, startY, startHeight]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setStartY(e.touches[0].clientY);
      setStartHeight(drawerHeight);
    }
  }, [drawerHeight]);

  const handleTouchMove = useCallback((e) => {
    if (!isDragging || e.touches.length !== 1) return;

    const deltaY = startY - e.touches[0].clientY;
    const newHeight = Math.max(20, Math.min(80, startHeight + (deltaY / window.innerHeight) * 100));

    if (newHeight < 25) {
      // Close drawer if dragged down too far
      setDrawerOpen(false);
      setSelectedBA(null);
      setIsDragging(false);
    } else {
      setDrawerHeight(newHeight);
    }
  }, [isDragging, startY, startHeight]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  React.useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Add global mouse event listeners when dragging
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

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
          <h1 className="text-xl font-semibold select-none">Brain Explorer</h1>
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
                <h2 className="font-semibold mb-4 text-sm text-muted-foreground">Brodmann areas:</h2>
                <div className="grid grid-cols-3 gap-2">
                  {meshesLoaded && [...new Set(
                    brainMeshes.current
                      .map((item) => {
                        const match = item.name.match(/\d+/);
                        return match ? match[0] : null;
                      })
                      .filter(Boolean)
                      .sort((a, b) => parseInt(a) - parseInt(b))
                  )].map((baNumber) => {
                    const meshItem = brainMeshes.current.find(item => {
                      const match = item.name.match(/\d+/);
                      return match && match[0] === baNumber;
                    });
                    return (
                      <button
                        key={baNumber}
                        onClick={() => handleSidebarBAClick(meshItem.name)}
                        className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all border cursor-pointer ${
                          selectedBA === meshItem.name
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                            : 'bg-background border-border hover:bg-accent hover:border-accent-foreground/20 hover:shadow-sm'
                        }`}
                      >
                        {baNumber}
                      </button>
                    );
                  })}
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
          className="fixed bottom-0 inset-x-0 z-50 bg-card/80 backdrop-blur-md text-foreground border-t border-border shadow-2xl animate-slide-up flex flex-col select-none"
          style={{ height: `${drawerHeight}vh` }}
        >
          {/* Drawer Handle - Fixed at top */}
          <div
            className="flex-shrink-0 w-full h-8 flex items-start justify-center pt-2 cursor-grab active:cursor-grabbing touch-none select-none"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          >
            <div className="w-24 h-1 bg-gray-400 rounded-full"></div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 w-full max-w-3xl mx-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-2xl font-bold">
                {getBrodmannAreaData(selectedBA)?.name || `Brodmann Area ${selectedBA}`}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setDrawerOpen(false);
                  setSelectedBA(null);
                }}
                className="cursor-pointer"
                aria-label="Close drawer"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="max-w-none space-y-4">
              {(() => {
                const areaData = getBrodmannAreaData(selectedBA);
                if (!areaData) {
                  return (
                    <p className="text-muted-foreground">
                      No detailed information available for <strong>Brodmann Area {selectedBA}</strong>.
                    </p>
                  );
                }
                
                return (
                  <>
                    {/* Location */}
                    {areaData.location && (
                      <div>
                        <h4 className="text-lg font-semibold mb-2">Location</h4>
                        <p className="text-muted-foreground">{areaData.location}</p>
                      </div>
                    )}
                    
                    {/* Subareas */}
                    {areaData.subareas && (
                      <div>
                        <h4 className="text-lg font-semibold mb-2">Subareas</h4>
                        <div className="space-y-2">
                          {Object.entries(areaData.subareas).map(([key, value]) => (
                            <div key={key} className="pl-4 border-l-2 border-primary/30">
                              <p className="font-medium">Area {key}</p>
                              <p className="text-sm text-muted-foreground">{value.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Cytoarchitecture */}
                    {areaData.cytoarchitecture && (
                      <div>
                        <h4 className="text-lg font-semibold mb-2">Cytoarchitecture</h4>
                        <div className="space-y-2">
                          {areaData.cytoarchitecture.general && (
                            <p className="text-sm text-muted-foreground">
                              <strong>General:</strong> {areaData.cytoarchitecture.general}
                            </p>
                          )}
                          {Object.entries(areaData.cytoarchitecture)
                            .filter(([key]) => key !== 'general' && key !== 'distinctive_features' && key !== 'note' && key !== 'distinctive_feature')
                            .map(([key, value]) => (
                              <p key={key} className="text-sm text-muted-foreground">
                                <strong>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</strong> {value}
                              </p>
                            ))}
                          {(areaData.cytoarchitecture.distinctive_features || areaData.cytoarchitecture.distinctive_feature) && (
                            <p className="text-sm text-muted-foreground">
                              <strong>Distinctive Features:</strong> {areaData.cytoarchitecture.distinctive_features || areaData.cytoarchitecture.distinctive_feature}
                            </p>
                          )}
                          {areaData.cytoarchitecture.note && (
                            <p className="text-sm text-muted-foreground italic">
                              Note: {areaData.cytoarchitecture.note}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Connectivity */}
                    {areaData.connectivity && (
                      <div>
                        <h4 className="text-lg font-semibold mb-2">Connectivity</h4>
                        <div className="space-y-2">
                          {areaData.connectivity.inputs && (
                            <p className="text-sm text-muted-foreground">
                              <strong>Inputs:</strong> {areaData.connectivity.inputs}
                            </p>
                          )}
                          {areaData.connectivity.outputs && (
                            <p className="text-sm text-muted-foreground">
                              <strong>Outputs:</strong> {areaData.connectivity.outputs}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Functions */}
                    {areaData.functions && areaData.functions.length > 0 && (
                      <div>
                        <h4 className="text-lg font-semibold mb-2">Functions</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {areaData.functions.map((func, index) => (
                            <li key={index} className="text-sm text-muted-foreground">{func}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Clinical Relevance */}
                    {areaData.clinical_relevance && areaData.clinical_relevance.length > 0 && (
                      <div>
                        <h4 className="text-lg font-semibold mb-2 text-yellow-600 dark:text-yellow-500">Clinical Relevance</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {areaData.clinical_relevance.map((item, index) => (
                            <li key={index} className="text-sm text-muted-foreground">{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Subcortical Structures - Layers */}
                    {areaData.layers && areaData.layers.length > 0 && (
                      <div>
                        <h4 className="text-lg font-semibold mb-2">Layers</h4>
                        <div className="space-y-2">
                          {areaData.layers.map((layer, index) => (
                            <div key={index} className="pl-4 border-l-2 border-primary/30">
                              <p className="font-medium">{layer.name}</p>
                              <p className="text-sm text-muted-foreground">{layer.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Subcortical Structures - Subdivisions */}
                    {areaData.subdivisions && areaData.subdivisions.length > 0 && (
                      <div>
                        <h4 className="text-lg font-semibold mb-2">Subdivisions</h4>
                        <div className="space-y-2">
                          {areaData.subdivisions.map((subdivision, index) => (
                            <div key={index} className="pl-4 border-l-2 border-primary/30">
                              <p className="font-medium">{subdivision.name}</p>
                              <p className="text-sm text-muted-foreground">{subdivision.structures}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Evidence Base */}
                    {areaData.evidence_base && (
                      <div>
                        <h4 className="text-lg font-semibold mb-2">Evidence Base</h4>
                        <p className="text-xs text-muted-foreground italic">{areaData.evidence_base}</p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

