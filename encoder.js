const fs = require('fs');
const { createCanvas } = require('canvas');
const path = require('path');
const { exec } = require('child_process');

// Constants
const pixelSize = 6; // Increase pixel size to reduce data per image
const width = 1920;   // Reduce width
const height = 1080;  // Reduce height
const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');
const fileToEncode = 'uploads/input.txt';
const outputDir = 'output_images';
const videoOutput = 'output_video.mp4';
const frameRate = 5; // Set frame rate (frames per second)

// Function to read the input text file
function readTextFile(fileName) {
    try {
        return fs.readFileSync(fileName, 'utf8');
    } catch (err) {
        console.error(`Error reading file ${fileName}:`, err.message);
        process.exit(1);
    }
}

// Function to convert text to binary
function textToBinary(text) {
    return text.split('').map(char => {
        const binary = char.charCodeAt(0).toString(2);
        return binary.padStart(8, '0');
    }).join('');
}

// Function to create a directory if it does not exist
function createDirectory(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// Function to map binary data to an image array
function generateImageArray(binaryData, chunkStart, chunkEnd) {
    const imageData = ctx.createImageData(width, height);
    let gridPos = 0;
    let chunkData = binaryData.substring(chunkStart, chunkEnd);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const pixelIndex = (y * width + x) * 4;
            gridPos = Math.floor(x / pixelSize) + (Math.floor(width / pixelSize) * Math.floor(y / pixelSize));
            const bits = chunkData.substr(gridPos * 2, 2);
            const color = getColor(bits);

            imageData.data[pixelIndex] = color[0];
            imageData.data[pixelIndex + 1] = color[1];
            imageData.data[pixelIndex + 2] = color[2];
            imageData.data[pixelIndex + 3] = 255; // Alpha channel
        }
    }
    return imageData;
}

// Function to get color based on binary bits
function getColor(bits) {
    switch (bits) {
        case '01':
            return [0, 0, 0, 255]; // Black
        case '10':
            return [255, 0, 0, 255]; // Red
        case '11':
            return [0, 255, 0, 255]; // Green
        default:
            return [0, 0, 255, 255]; // Blue
    }
}

// Function to save the generated image
function saveImage(imageData, outputPath) {
    ctx.putImageData(imageData, 0, 0);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
    console.log('Image saved to', outputPath);
}

// Function to split data and generate images
function encodeTextToImages() {
    const text = readTextFile(fileToEncode);
    const binaryData = textToBinary(text);
    const chunkSize = (Math.floor(width / pixelSize) * Math.floor(height / pixelSize)) * 2; // 2 bits per pixel
    const totalChunks = Math.ceil(binaryData.length / chunkSize);

    createDirectory(outputDir);

    for (let i = 0; i < totalChunks; i++) {
        const chunkStart = i * chunkSize;
        const chunkEnd = Math.min((i + 1) * chunkSize, binaryData.length);
        const imageData = generateImageArray(binaryData, chunkStart, chunkEnd);
        const outputPath = path.join(outputDir, `output_${i}.png`);
        saveImage(imageData, outputPath);
    }

    console.log(`${totalChunks} images saved in directory ${outputDir}`);
}

function generateVideoFromImages() {
    const command = `ffmpeg -framerate ${frameRate} -i ${outputDir}/output_%d.png -c:v libx264 -r 30 -pix_fmt yuv420p ${videoOutput}`;
    exec(command, (err, stdout, stderr) => {
        if (err) {
            console.error(`Error generating video: ${err.message}`);
            return;
        }
        console.log('Video generated successfully:', videoOutput);
    });
}

// Execute the main function
function main() {
    encodeTextToImages();
    generateVideoFromImages();
}

main();
