# 📸 Memora – AI-Powered Image Captioning  
**Making memories visible, making images accessible**

Memora is a **React Native app** that gives photos a voice. It automatically generates captions for images using AI, making them more accessible — especially for visually impaired users. Think of it as your personal photo storyteller that works in the background and never forgets to caption a moment.

## 🎥 Demo & Presentation

🎬 **[Watch Video Demo](https://drive.google.com/drive/folders/1hXjXBNl7EvJdDfkLM8z8z7iN69KsuVNr?usp=sharing)**  
📊 **[View Pitch Deck (PDF)](./Memora%20Pitch%20Deck.pdf)**  
📄 **[Download Pitch Deck (PowerPoint)](./Memora%20Pitch%20Deck%20PPT.pptx)**


## ✨ Features  

- **🤖 Automatic Captions** – Capture or import a photo, and Memora creates AI-powered captions instantly  
- **📱 Multiple Image Upload** – Select and process multiple images at once from your gallery  
- **🖼️ Enhanced Gallery View** – Browse all your images with clickable thumbnails and status indicators  
- **📝 Detailed Descriptions** – Generate comprehensive accessibility-focused descriptions on demand  
- **🔄 Reprocess Images** – Update alt text and descriptions for existing images  
- **⚡ Background Processing** – New images are auto-processed at intervals you choose (hourly/daily/weekly)  
- **⚙️ Customizable Settings** – Control connectivity, background fetch frequency, and AI options  
- **🛡️ Privacy First** – Captions are stored as metadata; your images never leave your device unless you enable cloud sync  
- **🌙 Dark Mode Support** – Fully responsive design with light/dark theme support  
- **♿ Accessibility Focused** – Designed specifically with blind and visually impaired users in mind  
- **☁️ Optional Google Sync** – Sign in with Google and sync captions to Google Photos metadata *(coming soon)*  

---

## 🛠️ Tech Stack  

- **Framework:** React Native with Expo SDK 51  
- **AI:** OpenAI Vision API (GPT-4o-mini)  
- **State Management:** Redux Toolkit + Redux Persist  
- **Navigation:** React Navigation  
- **Background Tasks:** expo-background-fetch  
- **Image Processing:** expo-image-picker + expo-media-library  
- **Storage:** Local with metadata; optional Google Photos API sync  
- **Type Safety:** TypeScript  
- **Styling:** React Native StyleSheet with dynamic theming  
- **Icons:** @expo/vector-icons (Ionicons & MaterialIcons)

---

## 🚀 Getting Started  

### Prerequisites  
- **Node.js** 18+ 
- **Expo CLI** → `npm install -g @expo/cli`  
- **OpenAI API key** (required for image captioning)  
- **Mobile device** or simulator for testing  
- *(Optional)* Firebase project + Google Photos API for cloud sync

### Installation  
```bash
# Clone the repository  
git clone https://github.com/ReservedSnow673/Memora.git  

# Navigate to project directory  
cd "Memora 2.0"  

# Install dependencies  
npm install

# Create environment file  
cp .env.example .env

# Add your OpenAI API key to .env file  
OPENAI_API_KEY=your_openai_api_key_here

# Start the development server  
npx expo start
```

### Running the App  
```bash
# For iOS (requires Xcode)  
npx expo run:ios

# For Android (requires Android Studio)  
npx expo run:android  

# For web development  
npx expo start --web

# Using Expo Go app  
npx expo start
# Then scan QR code with Expo Go app
```

---

## 📱 How to Use  

1. **📷 Take or Import Photos**  
   - Use "Take Photo" to capture new images  
   - Use "Pick Multiple" to select multiple images from your gallery  
   - Use "Browse All" to explore your entire photo library  
   - Use "Import All Gallery Images" for bulk processing  

2. **🤖 Automatic Processing**  
   - Images are automatically processed with AI-generated alt text  
   - View processing status with visual indicators (✓ processed, ⏱️ processing, ○ unprocessed)  

3. **📝 Generate Detailed Descriptions**  
   - Tap any image in the gallery to view details  
   - Use "Generate Detailed Description" for comprehensive accessibility descriptions  
   - Reprocess images to update alt text and descriptions  

4. **⚙️ Customize Settings**  
   - Configure theme (Light/Dark/System)  
   - Set processing frequency and conditions  
   - Manage OpenAI API key  
   - Control background processing options  

---

## 🎯 Key Features Showcase  

### 🤖 AI-Powered Accessibility  
- **Smart Alt Text (150 chars):** Concise, specific descriptions for screen readers  
- **Detailed Descriptions (1000 chars):** Comprehensive descriptions with spatial relationships and context  
- **Non-generic Approach:** Avoids generic phrases like "person smiling" for specific, meaningful descriptions  

### 📱 Enhanced User Experience  
- **Batch Processing:** Upload and process multiple images simultaneously  
- **Responsive Design:** Adapts to different screen sizes (phones/tablets)  
- **Status Indicators:** Visual feedback for processing states  
- **Theme Support:** Beautiful light and dark mode interfaces  

### ♿ Accessibility First  
- **Screen Reader Optimized:** Designed specifically for visually impaired users  
- **High Contrast Support:** Multiple color schemes for different needs  
- **Touch Target Optimization:** Large, accessible interactive elements  
- **Clear Navigation:** Intuitive layout with proper focus management  

---

## 🔧 Configuration  

### OpenAI API Setup  
1. Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)  
2. Add it to your `.env` file or configure it in the app settings  
3. The app uses GPT-4o-mini for cost-effective image analysis  

### Optional: Google Photos Integration  
*(Coming Soon)*  
1. Set up Firebase project  
2. Enable Google Photos API  
3. Configure OAuth credentials  

---

## 🤝 Contributing  

We welcome contributions! Please feel free to submit issues and enhancement requests.

### Development Setup  
```bash
# Install dependencies  
npm install

# Start development server  
npx expo start

# Run tests (when available)  
npm test
```

---

---

## 👨‍💻 Authors  

**ReservedSnow673**  
- GitHub: [@ReservedSnow673](https://github.com/ReservedSnow673)  
- Project: [Memora](https://github.com/ReservedSnow673/Memora)

**akshiita-m**  
- GitHub: [@akshiita-m](https://github.com/akshiita-m)

**Pranav435**  
- GitHub: [@Pranav435](https://github.com/Pranav435)

---

## 🙏 Acknowledgments  

- OpenAI for providing the Vision API  
- Expo team for the excellent React Native framework  
- The accessibility community for guidance and feedback  
- Beta testers and contributors  

---

**Made with ❤️ for accessibility and inclusion**
