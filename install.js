/**
 * Backend installation script
 * Run this with 'node install.js' to set up the backend
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Default environment values
const DEFAULT_ENV = {
  PORT: 5000,
  MONGODB_URI: "mongodb+srv://aymenhmida1:kGJInUb8eD6meHBt@cluster0.ftir2.mongodb.net/nexuradb?retryWrites=true&w=majority&appName=Cluster0&tls=true",
  FRONTEND_URL: "http://localhost:3000"
};

console.log('Setting up UiFormNexura backend...');

// Create .env file
const envPath = path.join(__dirname, '.env');
let envContent = '';

Object.entries(DEFAULT_ENV).forEach(([key, value]) => {
  envContent += `${key}=${value}\n`;
});

fs.writeFileSync(envPath, envContent);
console.log('.env file created successfully!');

// Install dependencies
console.log('Installing dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('Dependencies installed successfully!');
} catch (error) {
  console.error('Error installing dependencies:', error.message);
}

console.log('\nBackend setup completed successfully!');
console.log('\nTo start the backend server, run:');
console.log('npm run dev');

rl.close();
