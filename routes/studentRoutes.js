const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Student=require('../models/studentModel');
const protectRoute = require('../middlewares/protectRoute');

const router = express.Router();

router.post('/register', protectRoute(['admin']), async(req, res) => {
  try{
    const {email, password, name, roll, department}=req.body;

    if(!email || !password || !(name.firstName) || !roll || !department){
      return res.status(400).json({error: 'Please fill all fields'});
    }
    if(password.length<6){
      return res.status(400).json({error: 'Password must be atleast 6 characters long'});
    }

    const student=await Student.findOne({email});

    if(student){
      return res.status(400).json({error: 'User already exists'});
    }

    const salt=await bcrypt.genSalt(10);
    const hash=await bcrypt.hash(password, salt);

    const newStudent=new Student({
      email,
      password: hash,
      name,
      roll,
      department
    });

    await newStudent.save();

    if(!newStudent){
      return res.status(400).json({error: 'Error registering user'});
    }

    const students=await Student.find({}).select('-password').sort({name: 1});

    res.status(200).json({success: 'User registered successfully', students});
  }
  catch(err){
    console.log(err);
    res.status(500).json({error: 'Internal server error'});
  }
});

router.post('/login', async(req, res) => {
  try{
    const {email, password}=req.body;

    if(!email || !password){
      return res.status(400).json({error: 'Please fill all fields'});
    }

    const student=await Student.findOne({email});

    if(!student){
      return res.status(400).json({error: 'User not found'});
    }

    const isMatch=await bcrypt.compare(password, student.password);

    if(!isMatch){
      return res.status(400).json({error: 'Invalid credentials'});
    }

    const token=jwt.sign({_id: student._id, role: 'student'}, process.env.JWT_SECRET, {expiresIn: '1d'});

    delete student.password;
    const studentWithRole={...student.toObject(), role: 'student'};
    res.cookie('token', token, {httpOnly: true, sameSite: 'none', secure: true}).status(200).json({success: 'Logged in successfully', user: studentWithRole});
  }
  catch(err){
    console.log(err);
    res.status(500).json({error: 'Internal server error'});
  }
});

router.get('/all', protectRoute(['admin']), async(req, res) => {
  try{
    const students=await Student.find({}).select('-password').sort({name: 1});

    if(!students){
      return res.status(404).json({error: 'No students found'});
    }

    res.status(200).json({students});
  }
  catch(err){
    console.log(err);
    res.status(500).json({error: 'Internal server error'});
  }
});

module.exports=router;