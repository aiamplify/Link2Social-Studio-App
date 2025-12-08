import type { VercelRequest, VercelResponse } from '@vercel/node';

// LinkedIn credentials - in production, use environment variables
const LINKEDIN_CREDENTIALS = {
    accessToken: 'AQU6GxpezWX9MdtSKzNp2OoB7wLv7H2__9z6N7b00cF-OEP36g3IPfINNSiswEbhBrmA034TNW4utOizB9tdF_gOEPaXP1v4i5h5aPjFL4YKSlgi5qtvB-urHO2H8kOFXKfhsk0oMw_QF5996Y7o1KtA8zp8DfsyBaIL3VMUUcfK8V9ERxl087URHyMwYO-Lif_0UR382jL9ImiGSojlskbX5Pbb4_URc3I1725FYcSmZy8pjrdb7jul6nctMzO26fw5SorrgAQ1LMKnsxq0m3X11PDD7LgPQ6gWO38_3ifdKQbIcuj51XL6Fd4_wGj5QPELrUjlea0tuDG3UEkv9XuSX1G1hQ',
    personUrn: 'urn:li:person:-YApe9-tqr',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { text } = req.body;
        const { accessToken, personUrn } = LINKEDIN_CREDENTIALS;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        // Use the new Posts API
        const postData = {
            author: personUrn,
            commentary: text,
            visibility: 'PUBLIC',
            distribution: {
                feedDistribution: 'MAIN_FEED',
                targetEntities: [],
                thirdPartyDistributionChannels: []
            },
            lifecycleState: 'PUBLISHED',
            isReshareDisabledByAuthor: false
        };

        const response = await fetch('https://api.linkedin.com/rest/posts', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'X-Restli-Protocol-Version': '2.0.0',
                'LinkedIn-Version': '202312'
            },
            body: JSON.stringify(postData),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('LinkedIn API error:', errorText);

            let errorMessage = 'Failed to create LinkedIn post';
            try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.message || errorData.error || errorMessage;
            } catch {
                // Use default error message
            }

            return res.status(response.status).json({
                success: false,
                message: errorMessage,
            });
        }

        const postUrn = response.headers.get('x-restli-id');

        return res.status(200).json({
            success: true,
            message: 'Successfully posted to LinkedIn!',
            postId: postUrn || undefined,
        });
    } catch (error: any) {
        console.error('LinkedIn posting error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to post to LinkedIn',
        });
    }
}
