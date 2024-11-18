const express=require('express');
const jwt=require('jsonwebtoken');
const bcrypt=require('bcrypt');
const Professor=require('../models/professorModel');
const protectRoute = require('../middlewares/protectRoute');
const cloudinary=require('cloudinary');

const router=express.Router();

router.post('/register', protectRoute(['admin']), async(req, res) => {
  try{
    const {email, password, designation, name, profilePic, department, researchAreas, researchTechnologies, publications}=req.body;

    // console.log(req.body);
    if(!email || !password || !(name.firstName) || !department){
      return res.status(400).json({error: 'Please fill all fields'});
    }
    if(password.length<6){
      return res.status(400).json({error: 'Password must be atleast 6 characters long'});
    }

    const professor=await Professor.findOne({email});

    if(professor){
      return res.status(400).json({error: 'User already exists'});
    }

    const salt=await bcrypt.genSalt(10);
    const hash=await bcrypt.hash(password, salt);

    const newProfessor=new Professor({
      email,
      password: hash,
      designation,
      name: name,
      profilePic,
      department,
      researchAreas,
      researchTechnologies,
      publications
    });

    await newProfessor.save();

    if(!newProfessor){
      return res.status(400).json({error: 'Error registering user'});
    }

    const professors=await Professor.find({}).select('-password').sort({name: 1});

    return res.status(200).json({success: 'User Added successfully', professors});
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

    if(password.length<6){
      return res.status(400).json({error: 'Password must be atleast 6 characters long'});
    }

    const professor=await Professor.findOne({email});

    if(!professor){
      return res.status(400).json({error: 'User not found'});
    }

    const isMatch=await bcrypt.compare(password, professor.password);

    if(!isMatch){
      return res.status(400).json({error: 'Invalid credentials'});
    }

    const token=jwt.sign({_id: professor._id, role: 'professor'}, process.env.JWT_SECRET, {expiresIn: '1d'});

    delete professor.password;
    const professorWithRole={...professor.toObject(), role: 'professor'};
    res.cookie('token', token, {httpOnly: true, sameSite: 'strict', maxAge: 24*60*60*1000}).status(200).json({success: 'Logged in successfully', user: professorWithRole});
  }
  catch(err){
    console.log(err);
    res.status(500).json({error: 'Internal server error'});
  }
});

router.patch('/update', protectRoute(['professor']), async(req, res) => {
  const {userId, profilePic, ...updates}=req.body;

  try{
    if(profilePic){
      const uploadResponse=await cloudinary.uploader.upload(profilePic, {
        folder: 'professors',
        public_id: userId,
        overwrite: true
      });

      updates.profilePic=uploadResponse.secure_url;
    }

    const user=await Professor.findByIdAndUpdate(userId, {$set: updates}, {new: true, runValidators: true}).select('-password');
    
    if(!user){
      return res.status(404).json({error: 'User not found'});
    }

    res.status(200).json({success: 'User updated successfully', user});
  }
  catch(err){
    console.log(err);
    res.status(500).json({error: 'Internal server error'});
  }
});

router.post('/publication/add', protectRoute(['professor']), async(req, res) => {
  const {userId, title, abstract, keywords, downloadLink, year}=req.body;

  console.log(userId);
  try{
    const professor=await Professor.findById(userId);

    if(!professor){
      return res.status(404).json({error: 'User not found'});
    }

    const newPublication={title, abstract, keywords, downloadLink, year};

    professor.publications.push(newPublication);

    await professor.save();

    res.status(200).json({success: 'Publication added successfully', publications: professor.publications});
  }
  catch(err){
    console.log(err);
    res.status(500).json({error: 'Internal server error'});
  }
});

router.post('/publication', async(req, res) => {
  const {userId}=req.body;

  try{
    const professor=await Professor.findById(userId);

    if(!professor){
      return res.status(404).json({error: 'User not found'});
    }

    res.status(200).json({publications: professor.publications});
  }
  catch(err){
    console.log(err);
    res.status(500).json({error: 'Internal server error'});
  }
});


router.get('/all', async(req, res) => {
  try{
    const professors=await Professor.find({}).select('-password').sort({name: 1});

    if(!professors){
      return res.status(404).json({error: 'No professors found'});
    }

    res.status(200).json({professors});
  }
  catch(err){
    console.log(err);
    res.status(500).json({error: 'Internal server error'});
  }
});

router.get('/:id', async(req, res)=>{
  // const {_id}=req;
  const id=req.params.id;

  try{
    const professor=await Professor.findOne({_id: id}).select('-password');

    if(!professor){
      return res.status(404).json({error: 'Professor not found'});
    }

    res.status(200).json({professor});
  }
  catch(err){
    console.log(err);
    res.status(500).json({error: 'Internal server error'});
  }
})

module.exports=router;