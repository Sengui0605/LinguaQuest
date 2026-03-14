
const fs = require('fs');
const path = require('path');

// Mock browser objects
global.QuestionsDB = {};

const questionsJsPath = path.join(__dirname, '../public/js/questions.js');
const coursesJsonPath = path.join(__dirname, '../public/data/courses.json');

const questionsContent = fs.readFileSync(questionsJsPath, 'utf8');
const courses = JSON.parse(fs.readFileSync(coursesJsonPath, 'utf8'));

// Evaluate questions.js (safely-ish)
// We need to strip the "const QuestionsDB =" part if we want to eval, 
// or just regex for keys.
// The file has multiple QuestionsDB["key"] = ... assignments too.

const keys = [];
const regex = /QuestionsDB\["([^"]+)"\]|([a-zA-Z0-9-]+):\s*\[/g;
let match;
while ((match = regex.exec(questionsContent)) !== null) {
    keys.push(match[1] || match[2]);
}

let missing = 0;
courses.forEach(level => {
    level.courses.forEach(course => {
        if (!keys.includes(course.id)) {
            console.log(`❌ Missing questions for course: ${course.id}`);
            missing++;
        }
    });
});

if (missing === 0) {
    console.log("✅ All courses have questions defined!");
} else {
    console.log(`❌ Total missing: ${missing}`);
    process.exit(1);
}
