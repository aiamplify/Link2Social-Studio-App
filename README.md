<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Link2Social Studio

A visual intelligence platform powered by Google Gemini AI for creating social media content including infographics, carousels, blog posts, YouTube thumbnails, and AI-generated videos.

## Features

- 📊 Article to Infographic with Social Posts
- 🎠 Carousel Generator for LinkedIn/Instagram
- ✍️ Blog Remix Tool with AI-Generated Images
- 🖼️ YouTube Thumbnail Creator with Trend Analysis
- 🎬 Veo AI Video B-Roll Generator
- 🎥 Script-to-Scene Visualizer

## Run Locally

**Prerequisites:** Node.js 18+

1. **Clone the repository:**
   ```bash
   git clone https://github.com/aiamplify/Link2Social-Studio.git
   cd Link2Social-Studio
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up your API key:**
   - Create a `.env` file in the root directory
   - Add your Gemini API key:
     ```
     GEMINI_API_KEY=your_api_key_here
     ```
   - Get your API key from: https://aistudio.google.com/app/apikey

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   - Navigate to http://localhost:3000 (or the port shown in terminal)
   - Login with username: `admin` and password: `admin`

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/aiamplify/Link2Social-Studio)

### Manual Deployment

1. **Push your code to GitHub** (already done if you cloned this repo)

2. **Import to Vercel:**
   - Go to https://vercel.com
   - Click "Add New Project"
   - Import your GitHub repository

3. **Configure Environment Variables:**
   - In Vercel project settings, add:
     - Name: `GEMINI_API_KEY`
     - Value: Your Gemini API key

4. **Deploy:**
   - Click "Deploy"
   - Your app will be live in ~2 minutes!

## Important Notes

- **API Key Security:** The `.env` file is excluded from git via `.gitignore` to keep your API key secure
- **Paid API Required:** This app uses Gemini models with image generation capabilities, which require a paid Google Cloud Billing account
- **Environment Variables:** The app automatically detects whether it's running locally or in production and uses the appropriate configuration

## Tech Stack

- ⚡ Vite
- ⚛️ React 19
- 🎨 Tailwind CSS
- 🤖 Google Gemini AI (Gemini 3 Pro Image Preview & Veo)
- 📊 D3.js for visualizations
