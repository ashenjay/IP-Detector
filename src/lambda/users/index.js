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

        if (path === '/api/users' && method === 'GET') {
            return await getUsers(event);
        }

        if (path === '/api/users' && method === 'POST') {
            return await createUser(event);
        }

        if (path.startsWith('/api/users/') && method === 'PUT') {
            return await updateUser(event);
        }

        if (path.startsWith('/api/users/') && method === 'DELETE') {
            return await deleteUser(event);
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

async function getUsers(event) {
    try {
        const result = await dynamodb.scan({
            TableName: process.env.DYNAMODB_TABLE_USERS
        }).promise();

        // Remove passwords from response
        const users = result.Items.map(user => {
            const { password, ...userWithoutPassword } = user;
            return userWithoutPassword;
        });

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(users)
        };
    } catch (error) {
        console.error('Get users error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Failed to get users' })
        };
    }
}

async function createUser(event) {
    const { username, email, role, assignedCategories, password } = JSON.parse(event.body);

    if (!username || !email || !role || !password) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Username, email, role, and password are required' })
        };
    }

    // Check if username already exists
    try {
        const existingUser = await dynamodb.query({
            TableName: process.env.DYNAMODB_TABLE_USERS,
            IndexName: 'username-index',
            KeyConditionExpression: 'username = :username',
            ExpressionAttributeValues: {
                ':username': username
            }
        }).promise();

        if (existingUser.Items.length > 0) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Username already exists' })
            };
        }
    } catch (error) {
        console.error('Username check error:', error);
    }

    const user = {
        id: uuidv4(),
        username,
        email,
        role,
        assignedCategories: assignedCategories || [],
        password, // In production, hash this
        isActive: true,
        createdAt: new Date().toISOString(),
        createdBy: 'admin' // Get from JWT token in production
    };

    try {
        await dynamodb.put({
            TableName: process.env.DYNAMODB_TABLE_USERS,
            Item: user
        }).promise();

        // Remove password from response
        const { password: _, ...userResponse } = user;

        return {
            statusCode: 201,
            headers: corsHeaders,
            body: JSON.stringify(userResponse)
        };
    } catch (error) {
        console.error('Create user error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Failed to create user' })
        };
    }
}

async function updateUser(event) {
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

        await dynamodb.update({
            TableName: process.env.DYNAMODB_TABLE_USERS,
            Key: { id },
            UpdateExpression: `SET ${updateExpression.join(', ')}`,
            ExpressionAttributeValues: expressionAttributeValues,
            ExpressionAttributeNames: expressionAttributeNames
        }).promise();

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'User updated successfully' })
        };
    } catch (error) {
        console.error('Update user error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Failed to update user' })
        };
    }
}

async function deleteUser(event) {
    const id = event.pathParameters.id;

    try {
        await dynamodb.delete({
            TableName: process.env.DYNAMODB_TABLE_USERS,
            Key: { id }
        }).promise();

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'User deleted successfully' })
        };
    } catch (error) {
        console.error('Delete user error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Failed to delete user' })
        };
    }
}