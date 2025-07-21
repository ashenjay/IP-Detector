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

        if (path === '/api/categories' && method === 'GET') {
            return await getCategories(event);
        }

        if (path === '/api/categories' && method === 'POST') {
            return await createCategory(event);
        }

        if (path.startsWith('/api/categories/') && method === 'PUT') {
            return await updateCategory(event);
        }

        if (path.startsWith('/api/categories/') && method === 'DELETE') {
            return await deleteCategory(event);
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

async function getCategories(event) {
    try {
        const result = await dynamodb.scan({
            TableName: process.env.DYNAMODB_TABLE_CATEGORIES
        }).promise();

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(result.Items)
        };
    } catch (error) {
        console.error('Get categories error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Failed to get categories' })
        };
    }
}

async function createCategory(event) {
    const { name, label, description, color, icon } = JSON.parse(event.body);

    if (!name || !label || !description) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Name, label, and description are required' })
        };
    }

    // Check if name already exists
    try {
        const existingCategory = await dynamodb.query({
            TableName: process.env.DYNAMODB_TABLE_CATEGORIES,
            IndexName: 'name-index',
            KeyConditionExpression: 'name = :name',
            ExpressionAttributeValues: {
                ':name': name
            }
        }).promise();

        if (existingCategory.Items.length > 0) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Category name already exists' })
            };
        }
    } catch (error) {
        console.error('Category name check error:', error);
    }

    const category = {
        id: uuidv4(),
        name,
        label,
        description,
        color: color || 'bg-blue-500',
        icon: icon || 'Shield',
        isDefault: false,
        isActive: true,
        createdAt: new Date().toISOString(),
        createdBy: 'admin' // Get from JWT token in production
    };

    try {
        await dynamodb.put({
            TableName: process.env.DYNAMODB_TABLE_CATEGORIES,
            Item: category
        }).promise();

        return {
            statusCode: 201,
            headers: corsHeaders,
            body: JSON.stringify(category)
        };
    } catch (error) {
        console.error('Create category error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Failed to create category' })
        };
    }
}

async function updateCategory(event) {
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
            TableName: process.env.DYNAMODB_TABLE_CATEGORIES,
            Key: { id },
            UpdateExpression: `SET ${updateExpression.join(', ')}`,
            ExpressionAttributeValues: expressionAttributeValues,
            ExpressionAttributeNames: expressionAttributeNames
        }).promise();

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Category updated successfully' })
        };
    } catch (error) {
        console.error('Update category error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Failed to update category' })
        };
    }
}

async function deleteCategory(event) {
    const id = event.pathParameters.id;

    try {
        await dynamodb.delete({
            TableName: process.env.DYNAMODB_TABLE_CATEGORIES,
            Key: { id }
        }).promise();

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Category deleted successfully' })
        };
    } catch (error) {
        console.error('Delete category error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Failed to delete category' })
        };
    }
}