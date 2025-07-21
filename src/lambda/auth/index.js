const AWS = require('aws-sdk');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';

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

        if (path === '/api/auth/login' && method === 'POST') {
            return await handleLogin(event);
        }

        if (path === '/api/auth/logout' && method === 'POST') {
            return await handleLogout(event);
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

async function handleLogin(event) {
    const { username, password } = JSON.parse(event.body);

    if (!username || !password) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Username and password required' })
        };
    }

    try {
        // Query user by username
        const result = await dynamodb.query({
            TableName: process.env.DYNAMODB_TABLE_USERS,
            IndexName: 'username-index',
            KeyConditionExpression: 'username = :username',
            ExpressionAttributeValues: {
                ':username': username
            }
        }).promise();

        if (result.Items.length === 0) {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Invalid credentials' })
            };
        }

        const user = result.Items[0];

        // Check if user is active
        if (!user.isActive) {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Account is inactive' })
            };
        }

        // For demo purposes, we'll do simple password comparison
        // In production, use bcrypt.compare(password, user.password)
        if (password !== user.password) {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Invalid credentials' })
            };
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user.id, 
                username: user.username, 
                role: user.role,
                assignedCategories: user.assignedCategories 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Remove password from response
        const { password: _, ...userResponse } = user;

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                user: userResponse,
                token: token
            })
        };

    } catch (error) {
        console.error('Login error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Login failed' })
        };
    }
}

async function handleLogout(event) {
    // For JWT, logout is handled client-side by removing the token
    // In production, you might want to maintain a blacklist of tokens
    return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Logged out successfully' })
    };
}