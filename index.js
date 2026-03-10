const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');           // Used to save student photos
const path = require('path');
const Student = require('./models/Student');

const app = express();
app.use(cors());

// Allow large base64 image payloads
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

mongoose.connect('mongodb://127.0.0.1:27017/smartCampusDB')
    .then(() => console.log("Database Connected"))
    .catch(err => console.log("Connection Error:", err));

    /* ---------- ROOT ROUTE (Login Page Default) ---------- */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

/* ---------- SCAN API ---------- */
app.post('/scan', async (req, res) => {
    const { id, mode } = req.body;

    try {
        const student = await Student.findOne({ enrollmentNo: id });
        if (!student) return res.json({ status: "fail", message: "❌ Invalid Card!" });

        if (mode === "ENTRY") {
            if (student.status === "Inside")
                return res.json({ status: "fail", message: "⚠️ Already Inside!" });

            student.status = "Inside";
            student.lastLog = new Date();
            student.history.push({ action: "ENTRY", time: new Date() });
            await student.save();

            return res.json({ status: "success", type: "ENTRY", student });
        }

        if (mode === "EXIT") {
            if (student.status === "Outside")
                return res.json({ status: "fail", message: "⚠️ Already Outside!" });

            student.status = "Outside";
            student.lastLog = new Date();
            student.history.push({ action: "EXIT", time: new Date() });
            await student.save();

            return res.json({ status: "success", type: "EXIT", student });
        }

    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

/* ---------- LIVE DASHBOARD API ---------- */
app.get('/live-dashboard', async (req, res) => {
    try {
        const insideStudents = await Student.find({ status: "Inside" });
        res.json({ count: insideStudents.length, students: insideStudents });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/* ---------- STUDENT HISTORY API ---------- */
app.get('/student-history/:id', async (req, res) => {
    try {
        const student = await Student.findOne({ enrollmentNo: req.params.id });
        res.json(student ? student.history.reverse() : []);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/* ---------- EXPORT HISTORY API ---------- */
app.get('/export-history', async (req, res) => {
    try {
        const students = await Student.find({});
        let fullReport = [];

        students.forEach(s => {
            s.history.forEach(log => {
                fullReport.push({
                    enrollmentNo: s.enrollmentNo,
                    name: s.name,
                    course: s.course,
                    action: log.action,
                    time: log.time
                });
            });
        });

        fullReport.sort((a, b) => new Date(b.time) - new Date(a.time));
        res.json(fullReport);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/* ---------- ADD STUDENT API ---------- */
app.post('/add-student', async (req, res) => {
    const { name, enrollmentNo, course, semester, photo } = req.body;

    try {
        const existing = await Student.findOne({ enrollmentNo });
        if (existing)
            return res.json({ status: "fail", message: "Student ID already exists!" });

        const newStudent = new Student({
            name,
            enrollmentNo,
            course,
            semester,
            status: "Outside",
            history: []
        });
        await newStudent.save();

        if (photo) {
            const matches = photo.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                let ext = matches[1];
                const data = matches[2];
                if (ext === 'jpg' || ext === 'jpeg') ext = 'jpeg';

                const filePath = path.join(__dirname, 'public', `${enrollmentNo}.${ext}`);
                fs.writeFile(filePath, data, 'base64', err => {
                    if (err) console.log("Photo save error:", err);
                });
            }
        }

        res.json({ status: "success", message: "Student Added Successfully!" });

    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

app.listen(3000, () => console.log("Server Running..."));
