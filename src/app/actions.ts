'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function deleteArtwork(id: string) {
    const supabase = await createClient()

    const { error } = await supabase.from('artworks').delete().eq('id', id)

    if (error) {
        return { error: 'Failed to delete artwork.' }
    }

    revalidatePath('/')
    return { success: true }
}
