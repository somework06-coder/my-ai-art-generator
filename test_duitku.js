const crypto = require('crypto');

const MERCHANT_CODE = 'DS28238';
const API_KEY = '18fe773675e6649206b4f4eb4e76d875';
const SANDBOX_URL = 'https://sandbox.duitku.com/webapi/api/merchant/v2/inquiry';

function generateSignature(orderId, amount) {
    const signatureString = `${MERCHANT_CODE}${orderId}${amount}${API_KEY}`;
    return crypto.createHash('md5').update(signatureString).digest('hex');
}

async function testDuitku() {
    const orderId = `TEST-${Date.now()}`;
    const amount = 10000; // 10.000
    const signature = generateSignature(orderId, amount);

    const payload = {
        merchantCode: MERCHANT_CODE,
        paymentAmount: amount,
        paymentMethod: 'VC', // Virtual Account
        merchantOrderId: orderId,
        productDetails: 'Test Payment',
        email: 'test@example.com',
        customerVaName: 'Test User',
        callbackUrl: 'http://example.com/callback',
        returnUrl: 'http://example.com/return',
        signature: signature,
        expiryPeriod: 60
    };

    console.log('Sending Payload:', JSON.stringify(payload, null, 2));

    try {
        const response = await fetch(SANDBOX_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        console.log('Response Status:', response.status, response.statusText);

        const text = await response.text();
        console.log('Response Body:', text);

    } catch (error) {
        console.error('Error:', error);
    }
}

testDuitku();
