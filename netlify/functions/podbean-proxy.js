// netlify/functions/podbean-proxy.js

const fetch = require('node-fetch');

// Helper function to get a new access token from Podbean
const getAccessToken = async () => {
    const clientId = process.env.PODBEAN_CLIENT_ID;
    const clientSecret = process.env.PODBEAN_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('API credentials are not configured in environment variables.');
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
        throw error;
    }
};

// Main serverless function handler
exports.handler = async (event) => {
    // --- CORS Headers ---
    // This headers object will be added to every response.
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*', // Allows any origin
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };

    // Handle preflight requests for CORS
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,
            headers: corsHeaders,
            body: ''
        };
    }

    const { endpoint } = event.queryStringParameters;

    if (!endpoint) {
        return {
            statusCode: 400,
            headers: corsHeaders,
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

        const data = await response.json();

        // Combine the API data response with the CORS headers
        return {
            statusCode: response.status,
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data),
        };

    } catch (error) {
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
