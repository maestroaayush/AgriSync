const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://mrvandiary:iamaayush318@agridb.pxzpzfg.mongodb.net/agrisync?retryWrites=true&w=majority&appName=AgriDB';

async function directCleanup() {
    const client = new MongoClient(MONGODB_URI);
    
    try {
        console.log('Connecting to MongoDB Atlas...');
        await client.connect();
        console.log('Connected successfully!');
        
        const db = client.db('agrisync');
        
        // Get database stats first
        console.log('\n--- Database Stats ---');
        const dbStats = await db.stats();
        console.log(`Total data size: ${(dbStats.dataSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`Storage size: ${(dbStats.storageSize / 1024 / 1024).toFixed(2)} MB`);
        
        // List collections and their sizes
        const collections = await db.listCollections().toArray();
        console.log('\n--- Collection Sizes ---');
        
        for (const collection of collections) {
            try {
                const stats = await db.collection(collection.name).stats();
                const sizeInMB = (stats.size / 1024 / 1024).toFixed(2);
                const count = stats.count;
                console.log(`${collection.name}: ${sizeInMB} MB (${count} documents)`);
            } catch (error) {
                console.log(`${collection.name}: Error getting stats - ${error.message}`);
            }
        }
        
        console.log('\n--- Starting Cleanup ---');
        
        // Target the largest collections for cleanup
        const collectionsToClean = [
            'auditlogs',      // Usually the biggest
            'notifications',  // Often large
            'deliveries',     // May have many test records
            'inventories',    // May have duplicates
            'announcements',  // May have old data
            'cropforecasts'   // May have old forecasts
        ];
        
        let totalDeleted = 0;
        
        for (const collectionName of collectionsToClean) {
            try {
                const collection = db.collection(collectionName);
                const count = await collection.countDocuments();
                
                if (count > 0) {
                    console.log(`\nCleaning ${collectionName} (${count} documents)...`);
                    
                    if (collectionName === 'auditlogs') {
                        // Keep only the last 100 audit logs
                        const docs = await collection.find({}).sort({ createdAt: -1 }).skip(100).toArray();
                        if (docs.length > 0) {
                            const idsToDelete = docs.map(doc => doc._id);
                            const result = await collection.deleteMany({ _id: { $in: idsToDelete } });
                            console.log(`Deleted ${result.deletedCount} old audit logs`);
                            totalDeleted += result.deletedCount;
                        }
                    } else if (collectionName === 'notifications') {
                        // Delete notifications older than 30 days
                        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                        const result = await collection.deleteMany({ 
                            createdAt: { $lt: thirtyDaysAgo } 
                        });
                        console.log(`Deleted ${result.deletedCount} old notifications`);
                        totalDeleted += result.deletedCount;
                    } else if (collectionName === 'deliveries') {
                        // Delete test deliveries or deliveries older than 90 days
                        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
                        const result = await collection.deleteMany({ 
                            $or: [
                                { farmerId: /test/i },
                                { origin: /test/i },
                                { destination: /test/i },
                                { createdAt: { $lt: ninetyDaysAgo } }
                            ]
                        });
                        console.log(`Deleted ${result.deletedCount} old/test deliveries`);
                        totalDeleted += result.deletedCount;
                    } else if (collectionName === 'cropforecasts') {
                        // Delete forecasts older than 6 months
                        const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
                        const result = await collection.deleteMany({ 
                            createdAt: { $lt: sixMonthsAgo } 
                        });
                        console.log(`Deleted ${result.deletedCount} old crop forecasts`);
                        totalDeleted += result.deletedCount;
                    } else {
                        // For other collections, just delete older records
                        const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
                        const result = await collection.deleteMany({ 
                            createdAt: { $lt: sixtyDaysAgo } 
                        });
                        console.log(`Deleted ${result.deletedCount} old records from ${collectionName}`);
                        totalDeleted += result.deletedCount;
                    }
                }
            } catch (error) {
                console.log(`Error cleaning ${collectionName}: ${error.message}`);
            }
        }
        
        console.log(`\n--- Cleanup Complete ---`);
        console.log(`Total documents deleted: ${totalDeleted}`);
        
        // Check final stats
        const finalStats = await db.stats();
        console.log(`Final data size: ${(finalStats.dataSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`Space freed: ${((dbStats.dataSize - finalStats.dataSize) / 1024 / 1024).toFixed(2)} MB`);
        
    } catch (error) {
        console.error('Cleanup failed:', error);
    } finally {
        await client.close();
        console.log('Disconnected from MongoDB');
    }
}

directCleanup().catch(console.error);
