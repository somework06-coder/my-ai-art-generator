import { createClient } from '@/utils/supabase/client';
import { GeneratedShader } from '@/types';

/**
 * Maps a full Supabase artwork row to the GeneratedShader type used by the frontend
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSupabaseArtworkToShader(row: any): GeneratedShader {
    return {
        id: row.id,
        prompt: row.prompt || '',
        fragmentCode: row.fragment_code,
        timestamp: new Date(row.created_at).getTime(),
        createdAt: new Date(row.created_at).getTime(),
        aspectRatio: row.aspect_ratio || '16:9',
        duration: row.duration || 10,
        metadata: row.metadata || undefined
    };
}

/**
 * Loads all artworks for a specific user from Supabase
 */
export async function loadUserGallery(userId: string): Promise<GeneratedShader[]> {
    if (!userId) return [];

    const supabase = createClient();
    const { data, error } = await supabase
        .from('artworks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[Supabase Fetch] message=' + error.message + ' code=' + error.code + ' details=' + error.details + ' hint=' + error.hint);
        return [];
    }

    if (!data) return [];

    return data.map(mapSupabaseArtworkToShader);
}

/**
 * Saves a single shader to Supabase for a specific user
 */
export async function saveArtworkToCloud(userId: string, shader: GeneratedShader): Promise<boolean> {
    if (!userId) return false;

    const supabase = createClient();

    try {
        const { error } = await supabase
            .from('artworks')
            .upsert({
                id: shader.id,
                user_id: userId,
                prompt: shader.prompt,
                fragment_code: shader.fragmentCode,
                aspect_ratio: shader.aspectRatio,
                duration: shader.duration,
                metadata: shader.metadata,
                created_at: new Date(shader.timestamp || shader.createdAt || Date.now()).toISOString()
            });

        if (error) {
            console.error('[Supabase Save] message=' + error.message + ' code=' + error.code + ' details=' + error.details + ' hint=' + error.hint);
            console.error('[Supabase Save] keys=' + Object.keys(error).join(',') + ' type=' + typeof error);
            return false;
        }

        return true;
    } catch (err) {
        console.error('Exception saving artwork to Supabase:', err);
        return false;
    }
}

/**
 * Deletes a single artwork from Supabase
 */
export async function deleteArtworkFromCloud(id: string): Promise<boolean> {
    const supabase = createClient();

    try {
        const { error } = await supabase
            .from('artworks')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting artwork from Supabase:', error);
            return false;
        }

        return true;
    } catch (err) {
        console.error('Exception deleting artwork from Supabase:', err);
        return false;
    }
}

/**
 * Batch deletes multiple artworks from Supabase
 */
export async function deleteMultipleArtworksFromCloud(ids: string[]): Promise<boolean> {
    if (!ids || ids.length === 0) return true;

    const supabase = createClient();

    try {
        const { error } = await supabase
            .from('artworks')
            .delete()
            .in('id', ids);

        if (error) {
            console.error('Error batch deleting artworks from Supabase:', error);
            return false;
        }

        return true;
    } catch (err) {
        console.error('Exception batch deleting artworks from Supabase:', err);
        return false;
    }
}
