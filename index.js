import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './src/config/database.js';

// Import routes
import userRoutes from './src/routes/userRoutes.js';
import postRoutes from './src/routes/postRoutes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Add this to your index.js for detailed AWS debugging
app.get('/debug/aws-detailed', async (req, res) => {
  try {
    const { EventBridgeClient, ListEventBusesCommand, ListRulesCommand } = await import('@aws-sdk/client-eventbridge');
    const { SQSClient, ListQueuesCommand } = await import('@aws-sdk/client-sqs');
    const { LambdaClient, ListFunctionsCommand } = await import('@aws-sdk/client-lambda');
    
    const region = process.env.AWS_REGION;
    const credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    };

    // Check EventBridge
    const eventBridgeClient = new EventBridgeClient({ region, credentials });
    
    // List all event buses
    const eventBusesResult = await eventBridgeClient.send(new ListEventBusesCommand({}));
    
    // List rules on default bus
    const defaultRulesResult = await eventBridgeClient.send(new ListRulesCommand({}));
    
    // List rules on custom bus (if it exists)
    let customRulesResult = { Rules: [] };
    try {
      customRulesResult = await eventBridgeClient.send(new ListRulesCommand({
        EventBusName: 'insyd-notification-bus'
      }));
    } catch (e) {
      console.log('Custom bus not found or no access');
    }

    // Check SQS
    const sqsClient = new SQSClient({ region, credentials });
    const queuesResult = await sqsClient.send(new ListQueuesCommand({}));
    
    // Check Lambda
    const lambdaClient = new LambdaClient({ region, credentials });
    const functionsResult = await lambdaClient.send(new ListFunctionsCommand({}));

    res.json({
      region: region,
      eventBridge: {
        eventBuses: eventBusesResult.EventBuses?.map(bus => bus.Name) || [],
        rulesOnDefault: defaultRulesResult.Rules?.length || 0,
        rulesOnCustom: customRulesResult.Rules?.length || 0,
        customBusExists: eventBusesResult.EventBuses?.some(bus => bus.Name === 'insyd-notification-bus')
      },
      sqs: {
        totalQueues: queuesResult.QueueUrls?.length || 0,
        queueUrls: queuesResult.QueueUrls || [],
        insydQueueExists: queuesResult.QueueUrls?.some(url => url.includes('insyd-post-liked-queue')) || false
      },
      lambda: {
        totalFunctions: functionsResult.Functions?.length || 0,
        insydFunctionExists: functionsResult.Functions?.some(fn => fn.FunctionName === 'insyd-notification-processor') || false
      }
    });

  } catch (error) {
    console.error('❌ Detailed AWS debug failed:', error);
    res.status(500).json({
      error: error.message,
      region: process.env.AWS_REGION
    });
  }
});

// Connect to MongoDB
console.log('🔄 Connecting to MongoDB...');
connectDB()
  .then(() => {
    console.log('✅ MongoDB connected successfully');
  })
  .catch((error) => {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Insyd Notification System',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/posts', postRoutes);

// Root endpoint with API documentation
app.get('/', (req, res) => {
  res.json({
    message: 'Insyd Notification System - Event Driven Architecture Demo',
    endpoints: {
      health: 'GET /health',
      users: {
        'Get all users': 'GET /api/users',
        'Create user': 'POST /api/users',
        'Get user': 'GET /api/users/:userId',
        'Follow user': 'POST /api/users/:userId/follow',
        'Update preferences': 'PUT /api/users/:userId/preferences'
      },
      posts: {
        'Get all posts': 'GET /api/posts',
        'Create post': 'POST /api/posts',
        'Get post': 'GET /api/posts/:postId',
        'Like post': 'POST /api/posts/:postId/like',
        'Unlike post': 'DELETE /api/posts/:postId/like'
      }
    },
    architecture: 'Event-Driven with AWS EventBridge → SQS → Lambda → SNS',
    demo: 'Create users, posts, then like/follow to trigger notification events'
  });
});

// 404 handler
app.use('/*splat', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    availableRoutes: [
      'GET /',
      'GET /health', 
      'GET /api/users',
      'GET /api/posts'
    ]
  });
});


// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Server error:', error.message);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📋 API Documentation: http://localhost:${PORT}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/health`);
  console.log(`⚡ Ready for Event-Driven Architecture demo!`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📝 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('👋 Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n📝 SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('👋 Server closed');
    process.exit(0);
  });
});



export default app;
