const AWS = require('aws-sdk');
const https = require('https');
const { v4: uuidv4 } = require('uuid');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const secretsManager = new AWS.SecretsManager();

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

        if (path === '/api/ip-entries' && method === 'GET') {
            return await getIPEntries(event);
        }

        if (path === '/api/ip-entries' && method === 'POST') {
            return await createIPEntry(event);
        }

        if (path.startsWith('/api/ip-entries/') && method === 'PUT') {
            return await updateIPEntry(event);
        }

        if (path.startsWith('/api/ip-entries/') && method === 'DELETE') {
            return await deleteIPEntry(event);
        }

        if (path.startsWith('/api/ip-entries/check/') && method === 'GET') {
            return await checkIPReputation(event);
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

async function getIPEntries(event) {
    const category = event.queryStringParameters?.category;

    let params = {
        TableName: process.env.DYNAMODB_TABLE_IP_ENTRIES
    };

    if (category) {
        params = {
            TableName: process.env.DYNAMODB_TABLE_IP_ENTRIES,
            IndexName: 'category-index',
            KeyConditionExpression: 'category = :category',
            ExpressionAttributeValues: {
                ':category': category
            }
        };
    }

    try {
        const result = category ? 
            await dynamodb.query(params).promise() : 
            await dynamodb.scan(params).promise();

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(result.Items)
        };
    } catch (error) {
        console.error('Get IP entries error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Failed to get IP entries' })
        };
    }
}

async function createIPEntry(event) {
    const { ip, category, description, addedBy } = JSON.parse(event.body);

    if (!ip || !category || !addedBy) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'IP, category, and addedBy are required' })
        };
    }

    // Check if IP is whitelisted
    try {
        const whitelistCheck = await dynamodb.query({
            TableName: process.env.DYNAMODB_TABLE_WHITELIST,
            IndexName: 'ip-index',
            KeyConditionExpression: 'ip = :ip',
            ExpressionAttributeValues: {
                ':ip': ip
            }
        }).promise();

        if (whitelistCheck.Items.length > 0) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'IP is whitelisted' })
            };
        }
    } catch (error) {
        console.error('Whitelist check error:', error);
    }

    const ipEntry = {
        id: uuidv4(),
        ip,
        type: detectEntryType(ip),
        category,
        description: description || '',
        addedBy,
        dateAdded: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        source: 'manual',
        ttl: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 year TTL
    };

    // Get reputation for IP addresses
    if (ipEntry.type === 'ip') {
        try {
            const reputation = await getIPReputation(ip);
            if (reputation) {
                ipEntry.reputation = reputation;
            }
        } catch (error) {
            console.warn('Failed to get reputation for IP:', ip, error.message);
        }
    }

    try {
        await dynamodb.put({
            TableName: process.env.DYNAMODB_TABLE_IP_ENTRIES,
            Item: ipEntry
        }).promise();

        return {
            statusCode: 201,
            headers: corsHeaders,
            body: JSON.stringify(ipEntry)
        };
    } catch (error) {
        console.error('Create IP entry error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Failed to create IP entry' })
        };
    }
}

async function updateIPEntry(event) {
    const id = event.pathParameters.id;
    const updates = JSON.parse(event.body);

    try {
        const updateExpression = [];
        const expressionAttributeValues = {};
        const expressionAttributeNames = {};

        Object.keys(updates).forEach(key => {
            if (key !== 'id') {
                updateExpression.push(`#${key} = :${key}`);
                expressionAttributeValues[`:${key}`] = updates[key];
                expressionAttributeNames[`#${key}`] = key;
            }
        });

        updateExpression.push('#lastModified = :lastModified');
        expressionAttributeValues[':lastModified'] = new Date().toISOString();
        expressionAttributeNames['#lastModified'] = 'lastModified';

        await dynamodb.update({
            TableName: process.env.DYNAMODB_TABLE_IP_ENTRIES,
            Key: { id },
            UpdateExpression: `SET ${updateExpression.join(', ')}`,
            ExpressionAttributeValues: expressionAttributeValues,
            ExpressionAttributeNames: expressionAttributeNames
        }).promise();

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'IP entry updated successfully' })
        };
    } catch (error) {
        console.error('Update IP entry error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Failed to update IP entry' })
        };
    }
}

async function deleteIPEntry(event) {
    const id = event.pathParameters.id;

    try {
        await dynamodb.delete({
            TableName: process.env.DYNAMODB_TABLE_IP_ENTRIES,
            Key: { id }
        }).promise();

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'IP entry deleted successfully' })
        };
    } catch (error) {
        console.error('Delete IP entry error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Failed to delete IP entry' })
        };
    }
}

async function checkIPReputation(event) {
    const ip = event.pathParameters.ip;

    try {
        const reputation = await getIPReputation(ip);
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(reputation)
        };
    } catch (error) {
        console.error('Check IP reputation error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Failed to check IP reputation' })
        };
    }
}

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

async function getIPReputation(ip) {
    try {
        // Get API keys from Secrets Manager
        const secretValue = await secretsManager.getSecretValue({
            SecretId: process.env.SECRETS_NAME
        }).promise();

        const secrets = JSON.parse(secretValue.SecretString);
        const abuseipdbKey = secrets.abuseipdb_key;

        if (!abuseipdbKey) {
            throw new Error('AbuseIPDB API key not found');
        }

        // Call AbuseIPDB API
        const abuseData = await callAbuseIPDB(ip, abuseipdbKey);
        
        return {
            abuseConfidence: abuseData.abuseConfidencePercentage || 0,
            totalReports: abuseData.totalReports || 0,
            lastReported: abuseData.lastReportedAt || null,
            countryCode: abuseData.countryCode || null,
            isp: abuseData.isp || null
        };
    } catch (error) {
        console.error('Get IP reputation error:', error);
        return null;
    }
}

function callAbuseIPDB(ip, apiKey) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.abuseipdb.com',
            path: `/api/v2/check?ipAddress=${ip}&maxAgeInDays=90&verbose=true`,
            method: 'GET',
            headers: {
                'Key': apiKey,
                'Accept': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    if (response.data) {
                        resolve(response.data);
                    } else {
                        reject(new Error('Invalid response from AbuseIPDB'));
                    }
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', reject);
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        req.end();
    });
}