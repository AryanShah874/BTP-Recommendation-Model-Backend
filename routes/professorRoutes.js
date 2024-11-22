const express=require('express');
const jwt=require('jsonwebtoken');
const bcrypt=require('bcrypt');
const Professor=require('../models/professorModel');
const Student=require('../models/studentModel');
const protectRoute = require('../middlewares/protectRoute');
const cloudinary=require('cloudinary');

const router=express.Router();

// Register a new professor
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

// Login a professor
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
    res.cookie('token', token, {secure: true, sameSite: 'none', path: '/', domain: '.btp-recommendation-model-backend.vercel.app' ,maxAge: 24*60*60*1000}).status(200).json({success: 'Logged in successfully', user: professorWithRole});
    // res.cookie('token', token, {secure: true, sameSite: 'none', path: '/', maxAge: 24*60*60*1000}).status(200).json({success: 'Logged in successfully', user: professorWithRole});
  }
  catch(err){
    console.log(err);
    res.status(500).json({error: 'Internal server error'});
  }
});

// update a professor from dashboard
router.patch('/update', protectRoute(['professor']), async(req, res) => {
  const {profilePic, ...updates}=req.body;
  const userId=req._id;
  
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


// display all publications of a professor in addPublication
router.get('/publications', protectRoute(['professor']), async(req, res) => {
  const userId=req._id;

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

// add a publication to a professor
router.post('/publication/add', protectRoute(['professor']), async(req, res) => {
  const {title, abstract, keywords, downloadLink, year}=req.body;
  const userId=req._id;
  
  try{
    const professor=await Professor.findById(userId);

    if(!professor){
      return res.status(404).json({error: 'User not found'});
    }

    const newPublication={title, abstract, keywords, downloadLink, year};

    const updatedProfessor=await Professor.updateOne({_id: userId}, {$push: {publications: newPublication}});

    res.status(200).json({success: 'Publication added successfully', publications: updatedProfessor.publications});
  }
  catch(err){
    console.log(err);
    res.status(500).json({error: 'Internal server error'});
  }
});

// updating a publication of a professor
router.put('/publication/update/:id', protectRoute(['professor']), async(req, res) => {
  const {id}=req.params;
  const userId=req._id;
  const updates=req.body;

  try{
    const professor=await Professor.findById(userId);

    if(!professor){
      return res.status(404).json({error: 'User not found'}); 
    }

    const updatedProfessor=await Professor.updateOne({_id: userId, 'publications._id': id}, {$set: {'publications.$': updates}});

    res.status(200).json({success: 'Publication updated successfully'});
  }
  catch(err){
    console.log(err);
    res.status(500).json({error: 'Internal server error'});
  }
});


// deleting a publication of a professor
router.delete('/publication/delete/:id', protectRoute(['professor']), async(req, res) => {
  const {id}=req.params;
  const userId=req._id;

  try{
    const professor=await Professor.findById(userId);

    if(!professor){
      return res.status(404).json({error: 'User not found'});
    }
    
    const updatedProfessor=await Professor.updateOne({_id: userId}, {$pull: {publications: {_id: id}}});

    res.status(200).json({success: 'Publication deleted successfully'});
  }
  catch(err){
    console.log(err);
    res.status(500).json({error: 'Internal server error'});
  }
});

// getting a particular publication of a professor
router.get('/publication/:id', protectRoute(['professor']), async(req, res) => {
  const {id}=req.params;
  const userId=req._id;

  try{
    const professor=await Professor.findById(userId);

    if(!professor){
      return res.status(404).json({error: 'User not found'});
    }

    const publication=professor.publications.id(id); 

    if(!publication){
      return res.status(404).json({error: 'Publication not found'});
    }

    res.status(200).json({publication});
  }
  catch(err){
    console.log(err);
    res.status(500).json({error: 'Internal server error'});
  }
});

// updating the professor's account
router.put('/update/:id', protectRoute(['admin']), async(req, res) => {

  const {id}=req.params;
  const {password, ...updates}=req.body;

  try{
    if(password){
      const salt=await bcrypt.genSalt(10);
      const hash=await bcrypt.hash(password, salt);

      updates.password=hash;
    }

    const user=await Professor.findByIdAndUpdate(id, {$set: updates}, {new: true, runValidators: true}).select('-password');

    if(!user){
      return res.status(404).json({error: 'User not found'});
    }

    res.status(200).json({success: 'User updated successfully', user});
  }
  catch(err){
    console.log(err);
    res.status(500).json({error: 'Internal server error'});
  }
})

// delete a professor
router.delete('/delete/:id', protectRoute(['admin']), async(req, res) => {
  const {id}=req.params;

  try{
    // also remove from wishlist of students
    await Student.updateMany({professors: id}, {$pull: {professors: id}});

    const user=await Professor.findByIdAndDelete(id).select('-password');

    if(!user){
      return res.status(404).json({error: 'User not found'});
    }

    const professors=await Professor.find({}).select('-password').sort({name: 1});

    res.status(200).json({success: 'User deleted successfully', professors});
  }
  catch(err){
    console.log(err);
    res.status(500).json({error: 'Internal server error'});
  }
});

// get all professors
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

// get a particular professor
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