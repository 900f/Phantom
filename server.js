const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Make io accessible to routes
app.set('io', io);

// MongoDB connection
const MONGODB_URI = process.env.MONGO_URI || 'mongodb+srv://logant210:zJroMRsr6JaicwkE@phantom.mhlto4i.mongodb.net/phantom?retryWrites=true&w=majority';
mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
    maxPoolSize: 10,
    retryWrites: true
})
    .then(() => {
        console.log('MongoDB connected successfully');
    })
    .catch(err => {
        console.error('MongoDB connection error:', err.message);
        process.exit(1);
    });

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public', {
    setHeaders: (res, path) => {
        if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        }
    }
}));
app.use((req, res, next) => {
    console.log(`Request for: ${req.url}`);
    next();
});

// Mount API routes
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

// Serve HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/order', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'order.html'));
});

// Watch MongoDB boosters collection for changes
const { Booster } = require('./models');
async function watchBoosters() {
    try {
        if (mongoose.connection.readyState !== 1) {
            console.error('Cannot start change stream: MongoDB not connected');
            return;
        }
        const changeStream = Booster.watch([], { fullDocument: 'updateLookup' });
        changeStream.on('change', async (change) => {
            console.log('Booster change detected:', {
                operationType: change.operationType,
                documentKey: change.documentKey,
                fullDocument: change.fullDocument
            });
            try {
                const boosters = await Booster.find().lean();
                console.log('Fetched boosters:', boosters);
                io.emit('boosters_update', boosters);
                console.log('Emitted boosters_update:', boosters.length, 'boosters');
            } catch (err) {
                console.error('Error fetching boosters after change:', err.message);
            }
        });
        changeStream.on('error', (err) => {
            console.error('Change stream error:', err.message);
        });
    } catch (err) {
        console.error('Error setting up change stream:', err.message);
    }
}

// Start change stream and debug collection
mongoose.connection.once('open', async () => {
    console.log('MongoDB connection open');
    try {
        const { Booster } = require('./models');
        const boosters = await Booster.find().lean();
        console.log('Initial boosters check:', boosters);
        watchBoosters();
    } catch (err) {
        console.error('Error checking initial boosters:', err.message);
    }
});

// Socket.IO connection
io.on('connection', async (socket) => {
    console.log('Client connected:', socket.id);
    try {
        if (mongoose.connection.readyState !== 1) {
            throw new Error('MongoDB not connected');
        }
        const { Booster } = require('./models');
        const boosters = await Booster.find().lean();
        console.log('Sent initial boosters:', boosters);
        socket.emit('boosters_update', boosters);
    } catch (error) {
        console.error('Error fetching boosters on connect:', error.message);
        socket.emit('boosters_update', []);
    }
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Handle server shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Closing server...');
    await mongoose.connection.close();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Phantom Services server running on port ${PORT}`);
});