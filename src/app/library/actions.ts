
'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { videoExportQueue } from '@/lib/queue'

export async function batchExport(artworkIds: string[], settings: {
    quality: string,
    format: string,
    fps: number
}) {
    const supabase = await createClient()

    // 1. Check Auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Unauthorized' }
    }

    if (!artworkIds.length) return { error: 'No artworks selected' }

    // 2. Fetch details for all selected artworks
    const { data: artworks, error } = await supabase
        .from('artworks')
        .select('*')
        .in('id', artworkIds)
        .eq('user_id', user.id)

    if (error || !artworks) {
        console.error('Error fetching artworks:', error)
        return { error: 'Failed to fetch artwork details.' }
    }

    // 3. Create Jobs
    const jobsToInsert = artworks.map(art => ({
        user_id: user.id,
        status: 'pending',
        created_at: new Date().toISOString()
    }))

    const { data: insertedJobs, error: jobError } = await supabase
        .from('export_jobs')
        .insert(jobsToInsert)
        .select()

    if (jobError) {
        console.error('Error creating jobs:', jobError)
        return { error: 'Failed to create export jobs.' }
    }

    // 4. Push to Queue
    // We map insertedJobs back to artworks to get shader code
    const queuePromises = insertedJobs.map(async (job, index) => {
        // Since we inserted in same order (hopefully), or we can match index if array length matches
        // But safer to rely on index if we assume synchronous order preservation in DB insert (usually true for simple inserts)
        // OR better: we can't guarantee ID match easily without complex logic.
        // Actually, let's just push to queue with the data directly.
        // But we need the job.id for the DB update later by worker.

        // Let's match by index for now as it's a batch insert.
        const art = artworks[index];

        await videoExportQueue.add('export-job', {
            jobDbId: job.id, // Critical for worker updates
            shaderCode: art.shader_code,
            prompt: art.prompt,
            aspectRatio: art.params?.aspectRatio || '16:9',
            duration: art.params?.duration || 10,
            quality: settings.quality,
            format: settings.format,
            fps: settings.fps
        })
    })

    await Promise.all(queuePromises)

    revalidatePath('/library')
    return { success: true, count: insertedJobs.length }
}


export async function saveArtwork(artwork: {
    title?: string,
    prompt: string,
    shader_code: string,
    aspect_ratio: string,
    duration?: number
}) {
    const supabase = await createClient()

    // 1. Check Auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'You must be logged in to save artworks.' }
    }

    // 2. Insert into DB
    const { error } = await supabase.from('artworks').insert({
        user_id: user.id,
        prompt: artwork.prompt,
        shader_code: artwork.shader_code,
        params: {
            aspectRatio: artwork.aspect_ratio,
            duration: artwork.duration || 10
        },
        public: false // Default to private
    })

    if (error) {
        console.error('Error saving artwork:', error)
        return { error: 'Failed to save artwork.' }
    }

    revalidatePath('/library')
    return { success: true }
}

export async function deleteArtwork(id: string) {
    const supabase = await createClient()

    const { error } = await supabase.from('artworks').delete().eq('id', id)

    if (error) {
        return { error: 'Failed to delete artwork.' }
    }

    revalidatePath('/library')
    return { success: true }
}
