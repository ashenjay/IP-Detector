const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient();

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
};

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
        };
    }

    try {
        const path = event.path;
        const method = event.httpMethod;

        if (path.startsWith('/api/edl/') && method === 'GET') {
            return await getEDLFeed(event);
        }

        return {
            statusCode: 404,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Not found' })
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};

async function getEDLFeed(event) {
    const category = event.pathParameters.category;

    if (!category) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Category is required' })
        };
    }

    try {
        // Get IP entries for the category
        const ipResult = await dynamodb.query({
            TableName: process.env.DYNAMODB_TABLE_IP_ENTRIES,
            IndexName: 'category-index',
            KeyConditionExpression: 'category = :category',
            ExpressionAttributeValues: {
                ':category': category
            }
        }).promise();

        // Get whitelist entries to exclude
        const whitelistResult = await dynamodb.scan({
            TableName: process.env.DYNAMODB_TABLE_WHITELIST
        }).promise();

        const whitelistedIPs = new Set(whitelistResult.Items.map(item => item.ip));

        // Filter out whitelisted IPs and create EDL format
        const edlEntries = ipResult.Items
            .filter(entry => !whitelistedIPs.has(entry.ip))
            .map(entry => entry.ip);

        // Return as plain text for EDL consumption
        return {
            statusCode: 200,
            headers: {
                ...corsHeaders,
                'Content-Type': 'text/plain'
            },
            body: edlEntries.join('\n')
        };
    } catch (error) {
        console.error('Get EDL feed error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Failed to get EDL feed' })
        };
    }
}