'use client';

import { useState } from 'react';
import GeneratorInput from '@/components/GeneratorInput';
import ArtGrid from '@/components/ArtGrid';
import { GeneratedShader, GenerationMode, AspectRatio } from '@/types';

export default function HomePage() {
  const [shaders, setShaders] = useState<GeneratedShader[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (mode: GenerationMode, aspectRatio: AspectRatio, prompt?: string, count?: number, vibe?: string, complexity?: string, speed?: string, duration?: number, palette?: string, motionStyle?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-shader', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, prompt, count, aspectRatio, vibe, complexity, speed, duration, palette, motionStyle }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      // Add aspectRatio to each shader
      const shadersWithRatio = data.shaders.map((s: GeneratedShader) => ({
        ...s,
        aspectRatio
      }));

      setShaders(shadersWithRatio);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate art');
    } finally {
      setIsLoading(false);
    }
  };

  // Remix: generate a variation of an existing shader's prompt
  const handleRemix = (originalPrompt: string) => {
    const remixPrompt = `Create a NEW VARIATION inspired by this concept: "${originalPrompt}". Use a different color palette, different geometric approach, and different motion pattern, but keep the same overall mood and energy.`;
    handleGenerate('prompt', shaders[0]?.aspectRatio || '16:9', remixPrompt);
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
          <ArtGrid shaders={shaders} onRemix={handleRemix} />
        </section>
      </div>
    </main>
  );
}
