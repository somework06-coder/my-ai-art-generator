
'use client';

import { useState } from 'react';
import { GenerationMode, AspectRatio } from '@/types';

interface GeneratorInputProps {
    onGenerate: (mode: GenerationMode, aspectRatio: AspectRatio, prompt?: string, count?: number, vibe?: string, complexity?: string, speed?: string, duration?: number) => void;
    isLoading: boolean;
}

export default function GeneratorInput({ onGenerate, isLoading }: GeneratorInputProps) {
    const [mode, setMode] = useState<GenerationMode>('prompt');
    const [prompt, setPrompt] = useState('');
    const [count, setCount] = useState(4);
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
    const [vibe, setVibe] = useState('Random');
    const [complexity, setComplexity] = useState('Medium');
    const [speed, setSpeed] = useState('Medium');
    const [duration, setDuration] = useState(10); // Default 10s loop

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (mode === 'prompt' && prompt.trim()) {
            onGenerate('prompt', aspectRatio, prompt.trim(), undefined, vibe, complexity, speed, duration);
        } else if (mode === 'random') {
            onGenerate('random', aspectRatio, undefined, count, vibe, complexity, speed, duration);
        }
    };

    const countOptions = [1, 2, 4, 8];
    const vibeOptions = ['Random', 'Cyberpunk', 'Luxury', 'Nature', 'Zen', 'Retro', 'Mystic'];
    const complexityOptions = ['Minimalist', 'Medium', 'High', 'Insane'];
    const speedOptions = ['Slow', 'Medium', 'Fast', 'Hyper'];
    const durationOptions = [5, 10, 15, 30]; // Seconds

    const ratioOptions: { value: AspectRatio; label: string; icon: string }[] = [
        { value: '16:9', label: 'Landscape', icon: 'monitor' },
        { value: '9:16', label: 'Portrait', icon: 'smartphone' },
        { value: '1:1', label: 'Square', icon: 'square' },
    ];

    return (
        <div className="generator-input">
            {/* Header / Mode Switcher */}
            <div style={{ marginBottom: '20px' }}>
                <div style={{
                    display: 'flex',
                    background: 'rgba(0,0,0,0.4)',
                    padding: '4px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    width: '100%',
                }}>
                    <button
                        style={{
                            flex: 1,
                            padding: '8px 12px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 700,
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            transition: 'all 0.2s',
                            background: mode === 'prompt' ? 'var(--accent)' : 'transparent',
                            color: mode === 'prompt' ? '#000' : '#999',
                            boxShadow: mode === 'prompt' ? '0 2px 8px rgba(225,178,69,0.3)' : 'none',
                        }}
                        onClick={() => setMode('prompt')}
                        disabled={isLoading}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>auto_awesome</span>
                        AI Prompt
                    </button>
                    <button
                        style={{
                            flex: 1,
                            padding: '8px 12px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 700,
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            transition: 'all 0.2s',
                            background: mode === 'random' ? 'var(--accent)' : 'transparent',
                            color: mode === 'random' ? '#000' : '#999',
                            boxShadow: mode === 'random' ? '0 2px 8px rgba(225,178,69,0.3)' : 'none',
                        }}
                        onClick={() => setMode('random')}
                        disabled={isLoading}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>shuffle</span>
                        Random
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                {/* Aspect Ratio Selector */}
                <div className="ratio-section">
                    <label className="section-label">Aspect Ratio</label>
                    <div className="ratio-options">
                        {ratioOptions.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                className={`ratio-btn ${aspectRatio === option.value ? 'active' : ''}`}
                                onClick={() => setAspectRatio(option.value)}
                                disabled={isLoading}
                            >
                                <span className="material-symbols-outlined ratio-icon">{option.icon}</span>
                                <span className="ratio-label">{option.label}</span>
                                <span className="ratio-value">{option.value}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Prompt Input */}
                {mode === 'prompt' && (
                    <div className="prompt-section">
                        <label className="section-label">Describe Your Art</label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g. Cosmic nebula with swirling galaxies and twinkling stars..."
                            className="prompt-input"
                            disabled={isLoading}
                            rows={4}
                        />
                    </div>
                )}

                {/* Vibe & Complexity & Speed & Duration Controls */}
                <div className="controls-section" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>

                    {/* Row 1: Vibe & Duration */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                        <div className="control-group">
                            <label className="section-label"><span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: '4px' }}>palette</span> Vibe</label>
                            <div className="custom-select-wrapper">
                                <select
                                    value={vibe}
                                    onChange={(e) => setVibe(e.target.value)}
                                    className="custom-select"
                                    disabled={isLoading}
                                >
                                    {vibeOptions.map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                                <span className="material-symbols-outlined select-icon">expand_more</span>
                            </div>
                        </div>

                        <div className="control-group">
                            <label className="section-label"><span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: '4px' }}>timer</span> Loop</label>
                            <div className="custom-select-wrapper">
                                <select
                                    value={duration}
                                    onChange={(e) => setDuration(Number(e.target.value))}
                                    className="custom-select"
                                    disabled={isLoading}
                                >
                                    {durationOptions.map(d => <option key={d} value={d}>{d}s</option>)}
                                </select>
                                <span className="material-symbols-outlined select-icon">expand_more</span>
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Complexity & Speed */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="control-group">
                            <label className="section-label"><span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: '4px' }}>extension</span> Complexity</label>
                            <div className="range-container">
                                <input
                                    type="range"
                                    min="0"
                                    max="3"
                                    step="1"
                                    value={complexityOptions.indexOf(complexity)}
                                    onChange={(e) => setComplexity(complexityOptions[parseInt(e.target.value)])}
                                    className="custom-slider"
                                    disabled={isLoading}
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#666', marginTop: '-5px', fontWeight: 500 }}>
                                    <span>Low</span>
                                    <span style={{ color: 'var(--accent)' }}>{complexity}</span>
                                    <span>Max</span>
                                </div>
                            </div>
                        </div>

                        <div className="control-group">
                            <label className="section-label"><span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: '4px' }}>speed</span> Speed</label>
                            <div className="range-container">
                                <input
                                    type="range"
                                    min="0"
                                    max="3"
                                    step="1"
                                    value={speedOptions.indexOf(speed)}
                                    onChange={(e) => setSpeed(speedOptions[parseInt(e.target.value)])}
                                    className="custom-slider"
                                    disabled={isLoading}
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#666', marginTop: '-5px', fontWeight: 500 }}>
                                    <span>Slow</span>
                                    <span style={{ color: 'var(--accent)' }}>{speed}</span>
                                    <span>Fast</span>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Count Selector for Random Mode */}
                {mode === 'random' && (
                    <div className="count-section">
                        <label className="section-label">Number of Variations</label>
                        <div className="count-options">
                            {countOptions.map((n) => (
                                <button
                                    key={n}
                                    type="button"
                                    className={`count-btn ${count === n ? 'active' : ''}`}
                                    onClick={() => setCount(n)}
                                    disabled={isLoading}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Generate Button */}
                <button
                    type="submit"
                    className="generate-btn"
                    disabled={isLoading || (mode === 'prompt' && !prompt.trim())}
                >
                    {isLoading ? (
                        <>
                            <span className="spinner"></span>
                            Generating...
                        </>
                    ) : (
                        <><span className="material-symbols-outlined">brush</span> Generate Art</>
                    )}
                </button>
            </form>
        </div>
    );
}
