'use client';

import { useState, useEffect } from 'react';
import GeneratorInput from '@/components/GeneratorInput';
import ArtGrid from '@/components/ArtGrid';
import { GeneratedShader, GenerationMode, AspectRatio } from '@/types';
import { offlineStorage } from '@/lib/offlineStorage';

export default function HomePage() {
  const [shaders, setShaders] = useState<GeneratedShader[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load offline gallery on mount
  useEffect(() => {
    async function loadOfflineGallery() {
      try {
        const saved = await offlineStorage.getAllShaders();
        if (saved && saved.length > 0) {
          // Cast the cached types to GeneratedShader
          setShaders(saved as unknown as GeneratedShader[]);
        }
      } catch (err) {
        console.error('Failed to load offline gallery:', err);
      }
    }
    loadOfflineGallery();
  }, []);

  const handleGenerate = async (mode: GenerationMode, aspectRatio: AspectRatio, prompt?: string, count?: number, vibe?: string, complexity?: string, speed?: string, duration?: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-shader', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, prompt, count, aspectRatio, vibe, complexity, speed, duration }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      // Add aspectRatio and createdAt to each shader
      const shadersWithRatio = data.shaders.map((s: GeneratedShader) => ({
        ...s,
        aspectRatio,
        createdAt: Date.now()
      }));

      // Prepend to existing gallery
      setShaders(prev => [...shadersWithRatio, ...prev]);

      // Save to offline IndexedDB storage
      try {
        await Promise.all(shadersWithRatio.map((s: any) => offlineStorage.saveShader({
          id: s.id,
          title: s.title || 'Untitled',
          fragmentCode: s.fragmentCode,
          aspectRatio: s.aspectRatio,
          prompt: s.prompt || prompt || 'Untitled',
          createdAt: s.createdAt || Date.now(),
          metadata: s.metadata
        })));
      } catch (dbError) {
        console.error('Error saving to offline storage:', dbError);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate art');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete selected shaders from state + IndexedDB
  const handleDelete = async (ids: string[]) => {
    // Remove from React state
    setShaders(prev => prev.filter(s => !ids.includes(s.id)));

    // Remove from IndexedDB
    try {
      await Promise.all(ids.map(id => offlineStorage.deleteShader(id)));
    } catch (err) {
      console.error('Failed to delete from offline storage:', err);
    }
  };

  return (
    <main className="app-container">
      {/* Header Removed (Using Global Navbar) */}

      <div className="app-content">
        {/* Left Panel - Controls */}
        <aside className="control-panel">
          <GeneratorInput
            onGenerate={handleGenerate}
            isLoading={isLoading}
          />

          {error && (
            <div className="error-message">
              <p><span className="material-symbols-outlined" style={{ verticalAlign: 'bottom' }}>error</span> {error}</p>
            </div>
          )}

          {shaders.length > 0 && (
            <div className="results-info">
              <p><span className="material-symbols-outlined" style={{ verticalAlign: 'bottom' }}>auto_awesome</span> {shaders.length} art{shaders.length > 1 ? 's' : ''} generated</p>
              <p className="info-hint">Click download on any art to save as MP4</p>
            </div>
          )}
        </aside>

        {/* Main Area - Art Grid */}
        <section className="art-section">
          <ArtGrid shaders={shaders} onDelete={handleDelete} />
        </section>
      </div>
    </main>
  );
}
