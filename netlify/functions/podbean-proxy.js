// netlify/functions/podbean-proxy.js

const fetch = require('node-fetch');

// Helper function to get a new access token from Podbean
const getAccessToken = async () => {
    const clientId = process.env.PODBEAN_CLIENT_ID;
    const clientSecret = process.env.PODBEAN_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'API credentials are not configured in environment variables.' })
        };
    }

    const authUrl = 'https://api.podbean.com/v1/oauth/token';
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);

    try {
        const response = await fetch(authUrl, {
            method: 'POST',
            body: params
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error_description || 'Failed to obtain access token');
        }
        return data.access_token;
    } catch (error) {
        console.error('Error fetching access token:', error);
        throw error; // Rethrow to be caught by the handler
    }
};


// Main serverless function handler
exports.handler = async (event) => {
    const { endpoint } = event.queryStringParameters;

    if (!endpoint) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'The "endpoint" query parameter is required.' }),
        };
    }

    try {
        const accessToken = await getAccessToken();
        const apiUrl = `https://api.podbean.com/v1${endpoint}`;

        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
             const errorData = await response.json();
             return {
                statusCode: response.status,
                body: JSON.stringify(errorData),
            };
        }

        const data = await response.json();

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
