
'use client'

import { useState } from 'react'
import { GeneratedShader } from '@/types'
import ArtGrid from '@/components/ArtGrid'
import { batchExport } from './actions'

export default function LibraryContent({ initialShaders }: { initialShaders: GeneratedShader[] }) {
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [isExporting, setIsExporting] = useState(false)
    const [settings, setSettings] = useState({ quality: '4K', format: 'mp4', fps: 30 })

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        )
    }

    const handleBatchExport = async () => {
        if (selectedIds.length === 0) return

        setIsExporting(true)
        try {
            const result = await batchExport(selectedIds, settings)
            if (result.error) {
                alert(result.error)
            } else {
                alert(`Successfully queued ${result.count} videos for export!`)
                setSelectedIds([]) // clear selection
            }
        } catch (e) {
            console.error(e)
            alert('Failed to queue exports')
        } finally {
            setIsExporting(false)
        }
    }

    return (
        <>
            <div className="mb-6 flex items-center justify-between">
                <p className="text-gray-400 text-sm">
                    {selectedIds.length > 0
                        ? `${selectedIds.length} Selected`
                        : "Select artworks to batch export"}
                </p>
                {selectedIds.length > 0 && (
                    <button
                        onClick={() => setSelectedIds([])}
                        className="text-xs text-gray-500 hover:text-white"
                    >
                        Clear Selection
                    </button>
                )}
            </div>

            <ArtGrid
                shaders={initialShaders}
                isLibrary={true}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
            />

            {/* Floating Action Bar */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#1a1a1a] border border-white/10 rounded-full px-6 py-3 shadow-2xl flex items-center gap-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
                    <div className="flex items-center gap-4">
                        <select
                            value={settings.quality}
                            onChange={(e) => setSettings({ ...settings, quality: e.target.value })}
                            className="bg-transparent text-sm font-medium text-white outline-none cursor-pointer"
                        >
                            <option value="HD">HD</option>
                            <option value="FHD">FHD</option>
                            <option value="4K">4K</option>
                        </select>
                        <div className="w-[1px] h-4 bg-white/20"></div>
                        <select
                            value={settings.format}
                            onChange={(e) => setSettings({ ...settings, format: e.target.value })}
                            className="bg-transparent text-sm font-medium text-white outline-none cursor-pointer"
                        >
                            <option value="mp4">MP4</option>
                            <option value="mov">MOV</option>
                        </select>
                    </div>

                    <button
                        onClick={handleBatchExport}
                        disabled={isExporting}
                        className="bg-[var(--accent)] text-black px-4 py-2 rounded-full text-sm font-bold hover:brightness-110 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isExporting ? (
                            <>
                                <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                                Queuing...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-lg">rocket_launch</span>
                                Export {selectedIds.length} Items
                            </>
                        )}
                    </button>
                </div>
            )}
        </>
    )
}
