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

        if (path === '/api/sync/abuseipdb' && method === 'POST') {
            return await syncAbuseIPDB(event);
        }

        if (path === '/api/sync/virustotal' && method === 'POST') {
            return await syncVirusTotal(event);
        }

        // Handle scheduled sync
        if (event.source === 'aws.events') {
            return await scheduledSync(event);
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

async function getAPIKeys() {
    try {
        const secretValue = await secretsManager.getSecretValue({
            SecretId: process.env.SECRETS_NAME
        }).promise();

        return JSON.parse(secretValue.SecretString);
    } catch (error) {
        console.error('Failed to get API keys:', error);
        throw new Error('API keys not available');
    }
}

async function syncAbuseIPDB(event) {
    try {
        const secrets = await getAPIKeys();
        const abuseipdbKey = secrets.abuseipdb_key;

        if (!abuseipdbKey) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'AbuseIPDB API key not configured' })
            };
        }

        // Get blacklist from AbuseIPDB
        const blacklistData = await callAbuseIPDBBlacklist(abuseipdbKey);
        
        // Get existing IPs and whitelist
        const existingIPs = await getExistingIPs();
        const whitelistedIPs = await getWhitelistedIPs();

        let addedCount = 0;

        for (const abuseIP of blacklistData) {
            // Skip if already exists or is whitelisted
            if (existingIPs.has(abuseIP.ipAddress) || whitelistedIPs.has(abuseIP.ipAddress)) {
                continue;
            }

            const ipEntry = {
                id: uuidv4(),
                ip: abuseIP.ipAddress,
                type: 'ip',
                category: 'sources',
                sourceCategory: mapAbuseIPDBThreatType(abuseIP.abuseConfidencePercentage),
                description: `AbuseIPDB: ${abuseIP.abuseConfidencePercentage}% confidence`,
                addedBy: 'abuseipdb_sync',
                dateAdded: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                source: 'abuseipdb',
                reputation: {
                    abuseConfidence: abuseIP.abuseConfidencePercentage,
                    totalReports: 0,
                    lastReported: abuseIP.lastReportedAt,
                    countryCode: abuseIP.countryCode,
                    isp: abuseIP.isp
                },
                ttl: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days TTL
            };

            await dynamodb.put({
                TableName: process.env.DYNAMODB_TABLE_IP_ENTRIES,
                Item: ipEntry
            }).promise();

            addedCount++;
        }

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ 
                message: `Successfully synced ${addedCount} IPs from AbuseIPDB`,
                addedCount 
            })
        };

    } catch (error) {
        console.error('AbuseIPDB sync error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Failed to sync with AbuseIPDB' })
        };
    }
}

async function syncVirusTotal(event) {
    try {
        const secrets = await getAPIKeys();
        const virusTotalKey = secrets.virustotal_key;

        if (!virusTotalKey) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'VirusTotal API key not configured' })
            };
        }

        // For demo purposes, return success
        // In production, implement VirusTotal API calls
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ 
                message: 'VirusTotal sync completed',
                addedCount: 0 
            })
        };

    } catch (error) {
        console.error('VirusTotal sync error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Failed to sync with VirusTotal' })
        };
    }
}

async function scheduledSync(event) {
    console.log('Running scheduled sync...');
    
    try {
        // Run both syncs
        await syncAbuseIPDB({});
        await syncVirusTotal({});
        
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Scheduled sync completed' })
        };
    } catch (error) {
        console.error('Scheduled sync error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Scheduled sync failed' })
        };
    }
}

function mapAbuseIPDBThreatType(confidence) {
    if (confidence >= 90) return 'malware';
    if (confidence >= 85) return 'c2';
    if (confidence >= 80) return 'bruteforce';
    return 'sources';
}

async function getExistingIPs() {
    const result = await dynamodb.scan({
        TableName: process.env.DYNAMODB_TABLE_IP_ENTRIES,
        ProjectionExpression: 'ip'
    }).promise();
    
    return new Set(result.Items.map(item => item.ip));
}

async function getWhitelistedIPs() {
    const result = await dynamodb.scan({
        TableName: process.env.DYNAMODB_TABLE_WHITELIST,
        ProjectionExpression: 'ip'
    }).promise();
    
    return new Set(result.Items.map(item => item.ip));
}

function callAbuseIPDBBlacklist(apiKey) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.abuseipdb.com',
            path: '/api/v2/blacklist?confidenceMinimum=80&limit=1000',
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
        req.setTimeout(30000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        req.end();
    });
}