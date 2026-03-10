const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    name: String,
    enrollmentNo: String,
    course: String,
    semester: String,  
    status: { type: String, default: "Outside" },
    lastLog: { type: Date, default: Date.now }, 
    history: [
        {
            action: String,
            time: { type: Date, default: Date.now }
        }
    ]
});

module.exports = mongoose.model('Student', studentSchema);