import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server'; // Adjust path if needed
import { Duitku } from '@/lib/duitku';

// Configuration for Credit Packages
// Rp 5000 = 50 Credits (Ratio 1:100)
const CREDIT_RATIO = 100; // Rp 100 = 1 Credit? Wait, user said 5000 = 50 credits. So 1 credit = Rp 100.
// Correct: Rp 5000 / 50 = Rp 100 per credit.

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { amount, paymentMethod } = body;

        // Validation
        if (!amount || amount < 10000) {
            return NextResponse.json({ error: 'Minimum top up is Rp 10.000' }, { status: 400 });
        }

        // Calculate credits to add
        const credits = Math.floor(amount / 100);
        // Example: 5000 / 100 = 50 credits.

        // Create Merchant Order ID (Unique)
        // Format: TOPUP-{TIMESTAMP}-{USER_ID_SHORT}
        // Duitku often has a 50 char limit. UUID(36) + Timestamp(13) + Prefix(6) = 55+ chars (Too long).
        // Let's use Timestamp + Last 8 chars of User ID to keep it short and unique.
        const shortUserId = user.id.slice(-8); // Last 8 chars of UUID
        const merchantOrderId = `TOPUP-${Date.now()}-${shortUserId}`;

        // Create Invoice in Duitku
        const paymentParams = {
            paymentAmount: amount,
            paymentMethod: paymentMethod || 'SP', // Default to ShopeePay (QRIS)
            merchantOrderId: merchantOrderId,
            productDetails: `Top Up ${credits} Credits`,
            email: user.email || 'customer@email.com',
            customerVaName: user.user_metadata?.full_name || 'User',
            callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/duitku/callback`,
            returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?status=success`, // Redirect after payment
            expiryPeriod: 60
        };

        // Call Duitku API
        // NOTE: In Sandbox, Duitku sometimes returns HTML instead of JSON if errors occur. 
        // We handle this in the lib but be aware.
        const responseResponse = await Duitku.createInvoice(paymentParams); // Renamed to avoid confusion

        // Record pending transaction in Supabase
        // We use 'credit_transactions' or a separate 'orders' table?
        // Let's use 'credit_transactions' but mark it pending? 
        // The current schema only supports completed transactions (deductions/additions).
        // It's better to store the ORDER reference somewhere.
        // For simplicity in this iteration, we might just trust the Callback to insert the record.
        // BUT, for verification, we should store the orderId.

        // Let's create a temporary metadata entry or just log it. 
        // Improving: We should probably add a 'status' column to 'credit_transactions' if we want to track pending.
        // For now, we'll rely on the callback to CREATE the transaction record safely.

        return NextResponse.json({
            success: true,
            paymentUrl: responseResponse.paymentUrl,
            reference: responseResponse.reference
        });

    } catch (error: any) {
        console.error('Topup API Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
