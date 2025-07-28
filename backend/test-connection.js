const mongoose = require('mongoose');
require('dotenv').config();

async function testConnection() {
  try {
    console.log('Testing MongoDB Atlas connection...');
    console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');
    
    if (!process.env.MONGODB_URI) {
      console.log('❌ MONGODB_URI not found in .env file');
      console.log('Please add your MongoDB Atlas connection string to the .env file');
      return;
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Successfully connected to MongoDB Atlas!');
    console.log('Connection host:', mongoose.connection.host);
    
    // Test creating a collection
    const testCollection = mongoose.connection.collection('test');
    await testCollection.insertOne({ test: 'connection', timestamp: new Date() });
    console.log('✅ Successfully wrote to database');
    
    await testCollection.deleteOne({ test: 'connection' });
    console.log('✅ Successfully cleaned up test data');
    
    await mongoose.connection.close();
    console.log('✅ Connection test completed successfully!');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 Make sure your MongoDB Atlas cluster is running and accessible');
    } else if (error.message.includes('Authentication failed')) {
      console.log('💡 Check your username and password in the connection string');
    } else if (error.message.includes('ENOTFOUND')) {
      console.log('💡 Check your cluster URL in the connection string');
    }
  }
}

testConnection(); 