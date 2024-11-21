const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Student=require('../models/studentModel');
const Professor=require('../models/professorModel');
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

router.patch('/update', protectRoute(['student']), async(req, res) => {
  const {wishlist, userId}=req.body;
  
  try{
    const student=await Student.findByIdAndUpdate({_id: userId}, {professors: wishlist}, {new: true});

    if(!student){
      return res.status(404).json({error: 'User not found'});
    }

    res.status(200).json({success: 'Wishlist updated successfully'});
  } 
  catch(err){
    console.log(err);
    res.status(500).json({error: 'Internal server error'});
  }
});

router.get('/wishlist', protectRoute(['student']), async(req, res) => {
  const userId=req._id;
  try{
    const student=await Student.findById(userId);

    if(!student){
      return res.status(404).json({error: 'User not found'});
    }

    // find professors in the wishlist
    const professors=await Professor.find({_id: {$in: student.professors}}).select('-password').sort({name: 1});
    res.status(200).json({wishlist: professors});
  }
  catch(err){
    console.log(err);
    res.status(500).json({error: 'Internal server error'});
  }
});

//should be before :id as CastError: Cast to ObjectId failed for value "all" (type string) at path "_id" 
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

router.put('/update/:id', protectRoute(['admin']), async(req, res) => {
  const {id}=req.params;
  const {password, ...updates}=req.body;

  try{
    if(password){
      const salt=await bcrypt.genSalt(10);
      const hash=await bcrypt.hash(password, salt);

      updates.password=hash;
    }

    const student=await Student.findByIdAndUpdate(id, {$set: updates}, {new: true, runValidators: true}).select('-password');

    if(!student){
      return res.status(404).json({error: 'User not found'});
    }

    res.status(200).json({success: 'User updated successfully', student});
  }
  catch(err){
    console.log(err);
    res.status(500).json({error: 'Internal server error'});
  }
});

router.delete('/delete/:id', protectRoute(['admin']), async(req, res) => {
  const {id}=req.params;

  try{
    const student=await Student.findByIdAndDelete(id).select('-password');

    if(!student){
      return res.status(404).json({error: 'User not found'});
    }

    const students=await Student.find({}).select('-password').sort({name: 1});

    res.status(200).json({success: 'User deleted successfully', students});
  }
  catch(err){
    console.log(err);
    res.status(500).json({error: 'Internal server error'});
  }
});

router.get('/:id', protectRoute(['admin']), async(req, res) => {
  const id=req.params.id;
  try{
    const student=await Student.findById(id).select('-password');

    if(!student){
      return res.status(404).json({error: 'User not found'});
    }

    res.status(200).json({student});
  }
  catch(err){
    console.log(err);
    res.status(500).json({error: 'Internal server error'});
  }
});

module.exports=router;