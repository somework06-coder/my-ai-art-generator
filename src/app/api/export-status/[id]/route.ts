import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const id = (await params).id;

        if (!id) {
            return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: job, error } = await supabase
            .from('export_jobs')
            .select('status, video_url, error_msg, settings')
            .eq('id', id)
            .single();

        if (error || !job) {
            console.error('Fetch job error:', error);
            return NextResponse.json({ error: 'Job not found or inaccessible' }, { status: 404 });
        }

        return NextResponse.json({
            status: job.status,
            videoUrl: job.video_url,
            errorMsg: job.error_msg,
            format: job.settings?.format || 'mp4'
        });

    } catch (error) {
        console.error('Status check error:', error);
        return NextResponse.json(
            { error: 'Failed to check status' },
            { status: 500 }
        );
    }
}
