const express = require('express');
const dotenv = require('dotenv');

// 🔴 SABSE PEHLE ENVIRONMENT VARIABLES LOAD KARO 🔴
dotenv.config();

const cors = require('cors');
const connectDB = require('./config/db');

// Routes import karo
const orderRoutes = require('./routes/orderRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes'); 

// MongoDB se connect karo
connectDB();

// Express app initialize karo
const app = express();

// Middlewares
app.use(cors()); 
app.use(express.json());

// Routes connect karo
app.use('/api/orders', orderRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes); 
app.use('/api/wallet', require('./routes/walletRoutes'));
app.use('/api/inventory', require('./routes/inventoryRoutes'));

// Test Route
app.get('/', (req, res) => {
    res.send('Water Management API is running...');
});

// Server Start Karo
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});