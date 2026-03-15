'use client';

import { useState, useEffect } from 'react';
import GeneratorInput from '@/components/GeneratorInput';
import ArtGrid from '@/components/ArtGrid';
import { GeneratedShader, GenerationMode, AspectRatio } from '@/types';
import { generateRandomShaders, generateShaderFromPrompt } from '@/lib/openrouter';
import { offlineStorage } from '@/lib/offlineStorage';
import { createClient } from '@/utils/supabase/client';
import type { User } from '@supabase/supabase-js';
import { loadUserGallery, saveArtworkToCloud, deleteMultipleArtworksFromCloud } from '@/lib/supabaseGallery';
import { useCredits } from '@/hooks/useCredits';
import InsufficientCreditsModal from '@/components/InsufficientCreditsModal';

export default function HomePage() {
  const [shaders, setShaders] = useState<GeneratedShader[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  // Credit System
  const { credits, hasCredits, deductCredits, loading: creditsLoading } = useCredits();
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [requiredCredits, setRequiredCredits] = useState(0);

  // Fetch user session
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load gallery on mount or when user changes
  useEffect(() => {
    // Immediately clear gallery when user changes to prevent cross-user data leakage
    setShaders([]);

    async function loadGallery() {
      if (!user) {
        // Not logged in: show empty gallery
        setShaders([]);
        return;
      }

      try {
        // Step 1: Load from per-user local cache FIRST (instant, no network)
        const localSaved = await offlineStorage.getAllShaders(user.id);
        if (localSaved && localSaved.length > 0) {
          setShaders(localSaved as unknown as GeneratedShader[]);
        }

        // Step 2: Sync from Supabase (source of truth, may be slower)
        const cloudGallery = await loadUserGallery(user.id);
        if (cloudGallery.length > 0) {
          setShaders(cloudGallery);
          // Update local cache with cloud data
          for (const shader of cloudGallery) {
            try {
              await offlineStorage.saveShader({
                id: shader.id,
                title: shader.metadata?.title || 'Untitled',
                fragmentCode: shader.fragmentCode,
                aspectRatio: shader.aspectRatio,
                prompt: shader.prompt || 'Untitled',
                createdAt: shader.timestamp || Date.now(),
                metadata: shader.metadata
              }, user.id);
            } catch { /* silent cache update */ }
          }
        } else if (localSaved && localSaved.length === 0) {
          // Both cloud and local are empty
          setShaders([]);
        }
      } catch (err) {
        console.error('Failed to load gallery from Supabase:', err);
        // Keep local cache data if Supabase fails
      }
    }
    loadGallery();
  }, [user]);

  const handleGenerate = async (mode: GenerationMode, aspectRatio: AspectRatio, prompt?: string, count: number = 1, vibe?: string, complexity?: string, speed?: string, duration?: number) => {
    // 1. Credit Check (Only if logged in)
    if (user) {
      if (!hasCredits(count)) {
        setRequiredCredits(count);
        setShowCreditModal(true);
        return; // Abort generation
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      let generatedData: GeneratedShader[] = [];

      if (mode === 'random') {
        generatedData = await generateRandomShaders(count, vibe, complexity, speed, duration);
      } else {
        if (!prompt) throw new Error('Prompt is required for custom generation');

        const singleShader = await generateShaderFromPrompt(prompt, vibe, complexity, speed, duration);
        generatedData = [singleShader];

        for (let i = 1; i < count; i++) {
          const extraShader = await generateShaderFromPrompt(prompt, vibe, complexity, speed, duration);
          generatedData.push(extraShader);
        }
      }

      // Add aspectRatio and createdAt to each shader
      const shadersWithRatio = generatedData.map((s: GeneratedShader) => ({
        ...s,
        aspectRatio,
        createdAt: Date.now()
      }));

      // Prepend to React state
      setShaders(prev => [...shadersWithRatio, ...prev]);

      // Save to Cloud & Local Storage
      try {
        await Promise.all(shadersWithRatio.map(async (s: GeneratedShader) => {
          const shaderToSave = {
            id: s.id,
            title: s.metadata?.title || 'Untitled',
            fragmentCode: s.fragmentCode,
            aspectRatio: s.aspectRatio,
            prompt: s.prompt || prompt || 'Untitled',
            createdAt: s.timestamp || Date.now(),
            metadata: s.metadata
          };

          // 1. Save to Local FS (per-user folder) for fast native access
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await offlineStorage.saveShader(shaderToSave as any, user?.id);

          // 2. Save to Supabase (only if logged in)
          if (user) {
            await saveArtworkToCloud(user.id, s);
          }
        }));

        // 3. Deduct Credits (only if logged in and generation was successful)
        if (user) {
          await deductCredits(count, `Generated ${count} art${count > 1 ? 's' : ''}`);
        }

      } catch (saveError) {
        console.error('Error saving artwork to storage:', saveError);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate art');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete selected shaders
  const handleDelete = async (ids: string[]) => {
    // 1. Remove from React state
    setShaders(prev => prev.filter(s => !ids.includes(s.id)));

    try {
      // 2. Remove from Local FS (per-user folder)
      await Promise.all(ids.map(id => offlineStorage.deleteShader(id, user?.id)));

      // 3. Remove from Supabase (if logged in)
      if (user) {
        await deleteMultipleArtworksFromCloud(ids);
      }
    } catch (err) {
      console.error('Failed to delete artwork:', err);
    }
  };

  // Replace a broken shader with a fallback template
  const handleFixShader = async (shaderId: string, fallbackCode: string, metadata: any, prompt: string) => {
    // Find the current shader to retain its ID and timestamps
    const currentShader = shaders.find(s => s.id === shaderId);
    if (!currentShader) return;

    const fixedShader: GeneratedShader = {
      ...currentShader,
      fragmentCode: fallbackCode,
      metadata,
      prompt
    };

    // 1. Update React state
    setShaders(prev => prev.map(s => s.id === shaderId ? fixedShader : s));

    // 2. Save to Local Storage
    try {
      if (user || !user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await offlineStorage.saveShader(fixedShader as any, user?.id);
      }
    } catch (err) {
      console.error('Failed to update local storage for fixed shader:', err);
    }

    // 3. Save to Supabase (if logged in)
    if (user) {
      try {
        await saveArtworkToCloud(user.id, fixedShader);
      } catch (err) {
        console.error('Failed to update Supabase for fixed shader:', err);
      }
    }
  };

  return (
    <main className="app-container">
      {/* Header Removed (Using Global Navbar) */}

      <InsufficientCreditsModal
        isOpen={showCreditModal}
        onClose={() => setShowCreditModal(false)}
        requiredCredits={requiredCredits}
        currentCredits={credits}
      />

      <div className="app-content">
        {/* Left Panel - Controls */}
        <aside className="control-panel">
          <GeneratorInput
            onGenerate={handleGenerate}
            isLoading={isLoading}
            creditsLoading={creditsLoading}
            user={user}
            credits={credits}
          />

          {error && (
            <div className="error-message">
              <p><span className="material-symbols-outlined" style={{ verticalAlign: 'bottom' }}>error</span> {error}</p>
            </div>
          )}

          {shaders.length > 0 && (
            <div className="results-info">
              <p><span className="material-symbols-outlined" style={{ verticalAlign: 'bottom' }}>auto_awesome</span> {shaders.length} art{shaders.length > 1 ? 's' : ''} generated</p>
              <p className="info-hint">Export art as MOV/MP4, then download from Download Center</p>
            </div>
          )}
        </aside>

        {/* Main Area - Art Grid */}
        <section className="art-section">
          <ArtGrid shaders={shaders} onDelete={handleDelete} onFixShader={handleFixShader} />
        </section>
      </div>
    </main>
  );
}
