require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const connectDB = require('./db/connectDB');
const adminRoutes = require('./routes/adminRoutes');
const studentRoutes = require('./routes/studentRoutes');
const professorRoutes = require('./routes/professorRoutes');
const cors = require('cors');
const protectRoute=require('./middlewares/protectRoute');
const Admin = require('./models/adminModel');
const Student=require('./models/studentModel');
const Professor=require('./models/professorModel');
const cloudinary=require('cloudinary');

connectDB();

const app = express();

app.use(express.json());
app.use(cors({origin: 'https://lnmiit-btp-recommendation.vercel.app', credentials: true, methods: 'GET, POST, PUT, DELETE'}));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// app.use(express.static('public'));

app.use('/api/admin', adminRoutes);
app.use('/api/professor', professorRoutes);
app.use('/api/student', studentRoutes);

//cloudinary config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

app.get('/api/user', protectRoute(['admin', 'student', 'professor']), async (req, res) => {
    const userId=req._id;
    const role=req.role;

    try{
        let user;
        if(role==='admin'){
            user=await Admin.findById(userId).select('-password');
        }
        if(role==='student'){
            user=await Student.findById(userId).select('-password');
        }
        if(role==='professor'){
            user=await Professor.findById(userId).select('-password');
        }

        if(!user){
            return res.status(404).json({error: 'User not found'});
        }
        // also add role to admin
        const userWithRole={...user.toObject(), role};
        res.status(200).json({user: userWithRole});
    }
    catch(err){
        console.log(err);
        res.status(500).json({error: 'Internal server error'});
    }
});

app.get('/api/logout', protectRoute(['admin', 'professor', 'student']), async (req, res) => {
    res.clearCookie('token').status(200).json({success: 'Logged out successfully'});
});

app.get('/', (req, res) => {
    res.send('<h1>What are you doing here?</h1>')
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => { 
    console.log(`Server is running on port ${PORT}`);
});