#!/bin/bash

# Memora 2.0 Installation Script
echo "🚀 Installing Memora 2.0 - AI-Powered Image Captioning App"
echo "============================================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm and try again."
    exit 1
fi

echo "✅ Node.js and npm found"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Check if Expo CLI is installed globally
if ! command -v expo &> /dev/null; then
    echo "📲 Installing Expo CLI globally..."
    npm install -g @expo/cli
    
    if [ $? -eq 0 ]; then
        echo "✅ Expo CLI installed successfully"
    else
        echo "❌ Failed to install Expo CLI"
        exit 1
    fi
else
    echo "✅ Expo CLI found"
fi

# Create .env file from example if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created. Please update it with your API keys."
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🎉 Installation completed successfully!"
echo ""
echo "📋 Next Steps:"
echo "1. Update the .env file with your API keys:"
echo "   - OpenAI API key (required for AI captioning)"
echo "   - Firebase configuration (optional for Google integration)"
echo ""
echo "2. Start the development server:"
echo "   npx expo start"
echo ""
echo "3. Run on device/simulator:"
echo "   - Press 'i' for iOS simulator"
echo "   - Press 'a' for Android emulator"  
echo "   - Scan QR code with Expo Go app on physical device"
echo ""
echo "📖 For detailed setup instructions, see README.md"
echo ""
echo "Happy coding! 🎨📱"