
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import LibraryContent from './LibraryContent'
import Link from 'next/link'

export default async function LibraryPage() {
    const supabase = await createClient()

    // 1. Check Auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    // 2. Fetch Saved Artworks
    const { data: artworks, error } = await supabase
        .from('artworks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching library:', error)
    }

    // Transform for ArtGrid (map DB columns to component props)
    const shaders = artworks?.map(art => ({
        id: art.id,
        fragmentCode: art.shader_code,
        prompt: art.prompt,
        aspectRatio: art.params?.aspectRatio || '16:9',
        timestamp: new Date(art.created_at).getTime(),
        duration: art.params?.duration || 10
        // We might need to store the specific params used to generate it
    })) || []

    return (
        <main className="w-full min-h-screen bg-black text-white pb-20">
            <div className="max-w-[1600px] mx-auto px-6 py-10">
                <header className="mb-10 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[var(--accent)] to-white mb-2">
                            My Library
                        </h1>
                        <p className="text-gray-400 text-sm">
                            {shaders.length} saved artwork{shaders.length !== 1 ? 's' : ''}
                        </p>
                    </div>

                    <Link
                        href="/"
                        className="bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-lg">add</span>
                        Create New
                    </Link>
                </header>

                {shaders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-3xl text-gray-500">bookmarks</span>
                        </div>
                        <h3 className="text-xl font-semibold mb-2">No saved artworks yet</h3>
                        <p className="text-gray-500 max-w-md text-center mb-6">
                            Go to the generator and click the "Save" icon on any artwork you love to keep it here forever.
                        </p>
                        <Link
                            href="/"
                            className="bg-[var(--accent)] text-black font-bold px-6 py-3 rounded-lg hover:brightness-110 transition-all"
                        >
                            Start Creating
                        </Link>
                    </div>
                ) : (
                    <LibraryContent initialShaders={shaders} />
                )}
            </div>
        </main>
    )
}
