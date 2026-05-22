#!/usr/bin/env node

/**
 * ASDL Platform - Database Cleanup Script
 * Clears all collections from the MongoDB database to start fresh
 */

require('dotenv').config();

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'aadlc';

if (!MONGODB_URI) {
    console.error('Error: MONGODB_URI environment variable not set');
    console.error('Please set MONGODB_URI in your .env file');
    process.exit(1);
}

async function clearDatabase() {
    let client;
    try {
        console.log('Connecting to MongoDB...');
        client = new MongoClient(MONGODB_URI);
        await client.connect();

        const db = client.db(MONGODB_DB);
        console.log(`Connected to database: ${MONGODB_DB}`);

        // Get all collections
        const collections = await db.listCollections().toArray();
        console.log(`Found ${collections.length} collection(s)`);

        if (collections.length === 0) {
            console.log('Database is already empty!');
            await client.close();
            return;
        }

        // Drop all collections
        for (const collection of collections) {
            console.log(`Dropping collection: ${collection.name}`);
            await db.collection(collection.name).deleteMany({});
        }

        console.log('');
        console.log('========================================================');
        console.log('Database cleared successfully!');
        console.log('========================================================');
        console.log('');
        console.log('You can now start fresh:');
        console.log('  1. Run: .\start-all.ps1');
        console.log('  2. Visit: http://localhost:3000');
        console.log('  3. Create a new project and submit a PDD');
        console.log('');

        await client.close();
    } catch (error) {
        console.error('Error clearing database:', error.message);
        process.exit(1);
    }
}

// Run the cleanup
clearDatabase();
