
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
        shader_code: art.shader_code,
        status: 'pending',
        settings: {
            quality: settings.quality,
            format: settings.format,
            fps: settings.fps,
            aspectRatio: art.params?.aspectRatio || '16:9',
            duration: art.params?.duration || 10
        }
    }))

    const { data: insertedJobs, error: jobError } = await supabase
        .from('export_jobs')
        .insert(jobsToInsert)
        .select()

    if (jobError || !insertedJobs) {
        console.error('Error creating jobs:', jobError)
        return { error: 'Failed to create export jobs.' }
    }

    // 4. Push to Queue
    // We can safely match by DB job data now
    const queuePromises = insertedJobs.map(async (job) => {
        const s = job.settings;
        await videoExportQueue.add('export-job', {
            jobDbId: job.id,
            shaderCode: job.shader_code,
            aspectRatio: s.aspectRatio,
            duration: s.duration,
            quality: s.quality,
            format: s.format,
            fps: s.fps
        }, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 }
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
