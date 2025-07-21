const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

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

        if (path === '/api/whitelist' && method === 'GET') {
            return await getWhitelist(event);
        }

        if (path === '/api/whitelist' && method === 'POST') {
            return await addToWhitelist(event);
        }

        if (path.startsWith('/api/whitelist/') && method === 'DELETE') {
            return await removeFromWhitelist(event);
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

function detectEntryType(entry) {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\/(?:[0-9]|[1-2][0-9]|3[0-2]))?$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
    
    if (ipv4Regex.test(entry) || ipv6Regex.test(entry)) {
        return 'ip';
    }
    
    if (entry.includes('.') && entry.split('.').length >= 2) {
        return 'fqdn';
    }
    
    return 'hostname';
}

async function getWhitelist(event) {
    try {
        const result = await dynamodb.scan({
            TableName: process.env.DYNAMODB_TABLE_WHITELIST
        }).promise();

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(result.Items)
        };
    } catch (error) {
        console.error('Get whitelist error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Failed to get whitelist' })
        };
    }
}

async function addToWhitelist(event) {
    const { ip, description, addedBy } = JSON.parse(event.body);

    if (!ip || !addedBy) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'IP and addedBy are required' })
        };
    }

    // Check if IP already exists in whitelist
    try {
        const existingEntry = await dynamodb.query({
            TableName: process.env.DYNAMODB_TABLE_WHITELIST,
            IndexName: 'ip-index',
            KeyConditionExpression: 'ip = :ip',
            ExpressionAttributeValues: {
                ':ip': ip
            }
        }).promise();

        if (existingEntry.Items.length > 0) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'IP already in whitelist' })
            };
        }
    } catch (error) {
        console.error('Whitelist check error:', error);
    }

    const whitelistEntry = {
        id: uuidv4(),
        ip,
        type: detectEntryType(ip),
        description: description || '',
        addedBy,
        dateAdded: new Date().toISOString()
    };

    try {
        await dynamodb.put({
            TableName: process.env.DYNAMODB_TABLE_WHITELIST,
            Item: whitelistEntry
        }).promise();

        return {
            statusCode: 201,
            headers: corsHeaders,
            body: JSON.stringify(whitelistEntry)
        };
    } catch (error) {
        console.error('Add to whitelist error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Failed to add to whitelist' })
        };
    }
}

async function removeFromWhitelist(event) {
    const id = event.pathParameters.id;

    try {
        await dynamodb.delete({
            TableName: process.env.DYNAMODB_TABLE_WHITELIST,
            Key: { id }
        }).promise();

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Removed from whitelist successfully' })
        };
    } catch (error) {
        console.error('Remove from whitelist error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Failed to remove from whitelist' })
        };
    }
}