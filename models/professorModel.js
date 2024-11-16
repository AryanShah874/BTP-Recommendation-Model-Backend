const mongoose=require('mongoose');

const professorSchema=new mongoose.Schema({
  email: {type:String, unique:true, required:true},
  password: {type:String, required:true},
  designation: {type:String, enum: ['Assistant Professor', 'Associate Professor', 'Professor']},
  name: {
    firstName: {type:String, required:true},
    lastName: {type:String}
  },
  profilePic: {type:String, default: 'https://www.pngitem.com/pimgs/m/146-1468479_my-profile-icon-blank-profile-picture-circle-hd.png'},
  department: {type:String, required:true, enum: ['CSE', 'ECE', 'CCE', 'MME']},
  researchAreas: {type:String, default: ''},
  researchTechnologies: {type: String, default: ''},
  publications: [{title: {type: String}, abstract: {type: String}, downloadLink: {type: String} , keywords: [{type:String}], year: {type:Number}}],
});

const Professor=mongoose.model('Professor', professorSchema);

module.exports=Professor;