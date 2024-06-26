const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');
const path = require('path');
const { exec } = require('child_process');

// Constants
const pixelSize = 6;
const width = 1920;
const height = 1080;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');
const videoInput = 'output_video.mp4';
const frameDir = 'extracted_frames';
const decodedOutput = 'decoded_output.txt';
const tolerance = 150; // Tolerance for color detection

// Function to create a directory if it does not exist
function createDirectory(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// Function to extract frames from the video
function extractFramesFromVideo(callback) {
    createDirectory(frameDir);
    const command = `ffmpeg -i ${videoInput} -vf "fps=5" ${frameDir}/frame_%d.png`;
    exec(command, (err, stdout, stderr) => {
        if (err) {
            console.error(`Error extracting frames: ${err.message}`);
            return;
        }
        console.log('Frames extracted successfully.');
        callback();
    });
}

// Function to get binary data from an image
function getBinaryDataFromImage(imagePath, callback) {
    loadImage(imagePath).then((image) => {
        ctx.drawImage(image, 0, 0);
        const imageData = ctx.getImageData(0, 0, width, height);
        let binaryData = '';
        
        for (let y = 0; y < height; y += pixelSize) {
            for (let x = 0; x < width; x += pixelSize) {
                const pixelIndex = (y * width + x) * 4;
                const r = imageData.data[pixelIndex];
                const g = imageData.data[pixelIndex + 1];
                const b = imageData.data[pixelIndex + 2];
                const a = imageData.data[pixelIndex + 3];

                if (a === 0) continue;

                if (r > tolerance && g < tolerance && b < tolerance) {
                    binaryData += '10'; // Red
                } else if (r < tolerance && g > tolerance && b < tolerance) {
                    binaryData += '11'; // Green
                } else if (r < tolerance && g < tolerance && b > tolerance) {
                    binaryData += '00'; // Blue
                } else {
                    binaryData += '01'; // Black
                }
            }
        }
        
        callback(binaryData);
    }).catch((err) => {
        console.error(`Error loading image: ${err.message}`);
    });
}

// Function to convert binary to text
function binaryToText(binary) {
    let text = '';
    for (let i = 0; i < binary.length; i += 8) {
        const byte = binary.substring(i, i + 8);
        text += String.fromCharCode(parseInt(byte, 2));
    }
    return text;
}

// Function to decode the video into text
function decodeVideoToText() {
    fs.readdir(frameDir, (err, files) => {
        if (err) {
            console.error(`Error reading directory: ${err.message}`);
            return;
        }

        let binaryData = '';

        files.sort((a, b) => {
            const aIndex = parseInt(a.split('_')[1].split('.')[0], 10);
            const bIndex = parseInt(b.split('_')[1].split('.')[0], 10);
            return aIndex - bIndex;
        });

        let filesProcessed = 0;

        files.forEach((file) => {
            const filePath = path.join(frameDir, file);
            getBinaryDataFromImage(filePath, (data) => {
                binaryData += data;
                filesProcessed++;

                if (filesProcessed === files.length) {
                    const text = binaryToText(binaryData);
                    fs.writeFileSync(decodedOutput, text, 'utf8');
                    console.log(`Decoded text written to ${decodedOutput}`);
                }
            });
        });
    });
}

// Main function
function main() {
    extractFramesFromVideo(() => {
        decodeVideoToText();
    });
}

main();
