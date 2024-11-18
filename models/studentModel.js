const mongoose=require('mongoose');

const studentSchema=new mongoose.Schema({
  email: {type:String, unique:true, required:true},
  password: {type:String, required:true},
  name: {
    firstName: {type:String, required:true},
    lastName: {type:String}
  },
  roll: {type:String, unique: true, required:true},
  department: {type:String, required:true, enum: ['CSE', 'ECE', 'ME', 'CCE', 'MME']},
  professors: [{type: mongoose.Schema.Types.ObjectId, ref: 'Professor', default: []}],
});

const Student=mongoose.model('Student', studentSchema);

module.exports=Student;