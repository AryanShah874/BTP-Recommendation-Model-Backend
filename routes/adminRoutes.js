const express = require('express');
const bcrypt = require('bcrypt');
const Admin = require('../models/adminModel')
const jwt = require('jsonwebtoken');

const router = express.Router();

router.post('/register', async(req, res) => {
  const { email, password } = req.body;

  try{
    if(!email || !password){
      return res.status(400).json({error: 'Please fill all fields'});
    }
    if(password.length<6){
      return res.status(400).json({error: 'Password must be atleast 6 characters long'});
    }
    
    const admin=await Admin.findOne({email});
  
    if(admin){
      return res.status(400).json({error: 'User already exists'});
    }

    const salt=await bcrypt.genSalt(10);
    const hash=await bcrypt.hash(password, salt);
    
    const newAdmin=new Admin({
      email,
      password: hash
    });
  
    await newAdmin.save();
  
    if(!newAdmin){
      return res.status(400).json({error: 'Error registering user'});
    }
  
    // const token=jwt.sign({_id: newAdmin._id}, process.env.JWT_SECRET, expiresIn='1m');
  
    res.status(200).json({success: 'User registered successfully'});
  }
  catch(err){
    console.log(err);
    res.status(500).json({error: 'Internal server error'});
  }
});

router.post('/login', async(req, res) => {
  const { email, password } = req.body;

  try{
    if(!email || !password){
      return res.status(400).json({error: 'Please fill all fields'});
    }
    if(password.length<6){
      return res.status(400).json({error: 'Password must be atleast 6 characters long'});
    }
  
    const admin=await Admin.findOne({email});

    if(!admin){
      return res.status(400).json({error: 'User does not exist'});
    }

    const isMatch=await bcrypt.compare(password, admin.password);

    if(!isMatch){
      return res.status(400).json({error: 'Invalid credentials'});
    }

    const token=jwt.sign({_id: admin._id, role: 'admin'}, process.env.JWT_SECRET, {expiresIn: '1d'});

    delete admin.password;
    const adminWithRole={...admin.toObject(), role: 'admin'};
    
    res.cookie("token", token, {secure: true, sameSite: 'none', maxAge: 24*60*60*1000}).status(200).json({success: 'User logged in successfully', user: adminWithRole});
  }
  catch(err){
    console.log(err);
    res.status(500).json({error: 'Internal server error'});
  }
});

module.exports = router;