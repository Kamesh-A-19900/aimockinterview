/**
 * Environment Variables Check
 * 
 * Simple script to check if .env file is loading correctly
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

console.log('🔍 Environment Variables Check\n');

console.log('📁 Current working directory:', process.cwd());
console.log('📄 .env file path:', path.join(__dirname, '../.env'));

console.log('\n🔑 API Keys:');
console.log('GROQ_API_KEY:', process.env.GROQ_API_KEY ? 
  `${process.env.GROQ_API_KEY.substring(0, 10)}...` : 
  '❌ NOT FOUND');

console.log('\n📊 Database Config:');
console.log('DB_HOST:', process.env.DB_HOST ? '✅ Found' : '❌ NOT FOUND');
console.log('DB_NAME:', process.env.DB_NAME ? '✅ Found' : '❌ NOT FOUND');

console.log('\n🎯 All environment variables loaded:');
const envKeys = Object.keys(process.env).filter(key => 
  key.startsWith('GROQ_') || 
  key.startsWith('DB_') || 
  key.startsWith('AWS_')
);

envKeys.forEach(key => {
  const value = process.env[key];
  if (key.includes('KEY') || key.includes('SECRET') || key.includes('PASSWORD')) {
    console.log(`${key}: ${value ? value.substring(0, 10) + '...' : 'NOT SET'}`);
  } else {
    console.log(`${key}: ${value || 'NOT SET'}`);
  }
});

console.log('\n✅ Environment check completed!');