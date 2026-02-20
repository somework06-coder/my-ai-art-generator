import crypto from 'crypto';

// Configuration (Load from environment variables)
const DUITKU_MERCHANT_CODE = process.env.DUITKU_MERCHANT_CODE || '';
const DUITKU_API_KEY = process.env.DUITKU_API_KEY || '';
// Default to SANDBOX if not specified
const IS_PRODUCTION = process.env.DUITKU_ENV === 'production';

const DUITKU_API_URL = IS_PRODUCTION
    ? 'https://passport.duitku.com/webapi'
    : 'https://sandbox.duitku.com/webapi';

interface CreatePaymentParams {
    paymentAmount: number;
    paymentMethod: string; // 'VC', 'BK', etc.
    merchantOrderId: string;
    productDetails: string;
    email: string;
    phoneNumber?: string;
    customerVaName: string;
    callbackUrl: string;
    returnUrl: string;
    expiryPeriod?: number; // In minutes
}

interface PaymentResponse {
    merchantCode: string;
    reference: string;
    paymentUrl: string;
    statusCode: string;
    statusMessage: string;
}

export const Duitku = {
    /**
     * Generate MD5 signature for Duitku Request
     * Formula: MD5(merchantCode + merchantOrderId + paymentAmount + apiKey)
     */
    generateSignature(merchantOrderId: string, paymentAmount: number): string {
        const signatureString = `${DUITKU_MERCHANT_CODE}${merchantOrderId}${paymentAmount}${DUITKU_API_KEY}`;
        return crypto.createHash('md5').update(signatureString).digest('hex');
    },

    /**
     * Create a payment invoice
     */
    async createInvoice(params: CreatePaymentParams): Promise<PaymentResponse> {
        const signature = this.generateSignature(params.merchantOrderId, params.paymentAmount);

        const payload = {
            merchantCode: DUITKU_MERCHANT_CODE,
            paymentAmount: parseInt(params.paymentAmount.toString()), // Ensure int
            paymentMethod: params.paymentMethod,
            merchantOrderId: params.merchantOrderId,
            productDetails: params.productDetails,
            customerVaName: params.customerVaName,
            email: params.email,
            phoneNumber: params.phoneNumber || '',
            callbackUrl: params.callbackUrl,
            returnUrl: params.returnUrl,
            signature: signature,
            expiryPeriod: params.expiryPeriod || 60
        };

        try {
            const response = await fetch(`${DUITKU_API_URL}/api/merchant/v2/inquiry`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': JSON.stringify(payload).length.toString()
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Duitku API Error Body:', errorText);
                throw new Error(`Duitku API Error: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const data = await response.json();
            return data as PaymentResponse;
        } catch (error) {
            console.error('Duitku Create Invoice Error:', error);
            throw error;
        }
    },

    /**
     * Verify Callback Signature
     * Formula: MD5(merchantCode + amount + merchantOrderId + apiKey)
     * Note: 'amount' in callback might be string or number, ensure consistent formatting if needed.
     */
    verifyCallbackSignature(merchantCode: string, amount: number | string, merchantOrderId: string, signature: string): boolean {
        // Duitku callback amount usually comes as integer (no decimals) if it's IDR ??? 
        // Docs say amount in callback is used for signature.
        const calculatedSignature = crypto.createHash('md5')
            .update(`${merchantCode}${amount}${merchantOrderId}${DUITKU_API_KEY}`)
            .digest('hex');

        return calculatedSignature === signature;
    }
};
