const mongoose = require('mongoose');
require('dotenv').config();

async function testMongoConnection() {
  console.log('🔗 Testing MongoDB Atlas connection...');
  console.log('🔗 URI:', process.env.MONGO_URI ? 'URI found in .env' : 'No URI in .env');
  
  const mongoOptions = {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000,
    maxPoolSize: 10,
    retryWrites: true,
    retryReads: true,
  };

  try {
    // Test with a more lenient timeout first
    await mongoose.connect(process.env.MONGO_URI, mongoOptions);
    console.log('✅ MongoDB connection successful!');
    
    // Test a simple operation
    const adminDb = mongoose.connection.db.admin();
    const result = await adminDb.ping();
    console.log('✅ MongoDB ping successful:', result);
    
    // List databases to verify full connectivity
    const databases = await adminDb.listDatabases();
    console.log('✅ Available databases:', databases.databases.map(db => db.name));
    
    await mongoose.connection.close();
    console.log('✅ Connection test completed successfully');
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    
    if (error.code) {
      console.error('Error code:', error.code);
    }
    
    if (error.codeName) {
      console.error('Error codeName:', error.codeName);
    }
    
    // Check for specific connection issues
    if (error.message.includes('Server selection timed out')) {
      console.log('\n🔧 Troubleshooting suggestions:');
      console.log('1. Check your internet connection');
      console.log('2. Verify MongoDB Atlas cluster is running');
      console.log('3. Check if your IP address is whitelisted in MongoDB Atlas');
      console.log('4. Verify the connection string is correct');
      console.log('5. Try using a different network (mobile hotspot, etc.)');
    }
    
    if (error.message.includes('Authentication failed')) {
      console.log('\n🔧 Authentication troubleshooting:');
      console.log('1. Verify username and password in connection string');
      console.log('2. Check if database user exists in MongoDB Atlas');
      console.log('3. Verify user has proper permissions');
    }
  }
}

testMongoConnection();
