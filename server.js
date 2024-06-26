const express = require('express');
const multer = require('multer');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');

const app = express();
const port = 3000;

// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads');
    },
    filename: (req, file, cb) => {
        cb(null, 'input.txt');
    }
});
const upload = multer({ storage: storage });

// Serve static files
app.use(express.static('public'));

// Serve index.html at the root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle file upload
app.post('/upload', upload.single('file'), (req, res) => {
    const outputPath = path.join(__dirname, 'output_video.mp4');
    const encoderProcess = exec(`node encoder.js ${outputPath}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            res.status(500).send('Error encoding file.');
            return;
        }
        if (stderr) {
            console.error(`Stderr: ${stderr}`);
        }
        console.log(`Stdout: ${stdout}`);

        res.sendFile(outputPath, (err) => {
            if (err) {
                console.error(`Error sending video: ${err.message}`);
                res.status(err.status).end();
            } else {
                console.log('Video sent successfully');
            }
        });
    });
});

// Handle video decoding
app.post('/decode', upload.single('video'), (req, res) => {
    const videoInputPath = req.file.path;
    const outputPath = path.join(__dirname, 'decoded_output.txt');
    const decoderProcess = exec(`node decoder.js ${videoInputPath} ${outputPath}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            res.status(500).send('Error decoding video.');
            return;
        }
        if (stderr) {
            console.error(`Stderr: ${stderr}`);
        }
        console.log(`Stdout: ${stdout}`);

        res.download(outputPath, (err) => {
            if (err) {
                console.error(`Error downloading decoded text: ${err.message}`);
                res.status(err.status).end();
            } else {
                console.log('Decoded text downloaded successfully');
            }
        });
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
