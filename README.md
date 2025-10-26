# Creative & Technical Consultancy Website

A modern, performant website built with Next.js 14+, TypeScript, Tailwind CSS, and Framer Motion.

## Tech Stack

- **Next.js 16+** - React framework with App Router
- **TypeScript** - Type safety and better developer experience
- **Tailwind CSS v4** - Utility-first CSS framework with custom design tokens
- **Framer Motion** - Smooth animations and page transitions
- **ESLint & Prettier** - Code quality and formatting

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

## Project Structure

```
├── app/                 # Next.js App Router pages and layouts
├── components/          # Reusable React components
├── lib/                 # Utility functions and shared logic
├── public/              # Static assets (images, icons, etc.)
├── tailwind.config.ts   # Tailwind CSS configuration
├── next.config.ts       # Next.js configuration
└── tsconfig.json        # TypeScript configuration
```

## Development

The project uses:
- **App Router** for file-based routing
- **Custom design tokens** in `app/globals.css` for consistent theming
- **Page transitions** via `app/template.tsx` with Framer Motion
- **Path aliases** (`@/*`) for clean imports

## Voice Recording Setup

The website includes a voice recording feature that allows users to book consultation calls through voice messages. This feature uses the browser's Web Audio API (MediaRecorder) for actual audio capture, allowing users to record, playback, and confirm their voice messages before sending. The system integrates with Google Calendar for automatic event creation.

### Audio Recording Implementation

The voice recording feature captures actual audio using the Web Audio API's MediaRecorder interface, providing:
- **Real audio capture**: Records actual voice data as WebM audio files
- **Playback confirmation**: Users can listen to their recording before sending
- **High-quality audio**: Uses optimized audio settings (echo cancellation, noise suppression, 44.1kHz sample rate)
- **Cross-browser support**: Works in all modern browsers that support MediaRecorder

**Note**: The current implementation includes a placeholder for transcription service integration. In a production environment, you would integrate with a service like Google Speech-to-Text, Azure Speech Services, or AWS Transcribe to convert the audio to text for sentiment analysis.

### Google Calendar API Setup

1. **Create a Google Cloud Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the Google Calendar API

2. **Create a Service Account**:
   - Navigate to "IAM & Admin" > "Service Accounts"
   - Click "Create Service Account"
   - Give it a name like "calendar-bot"
   - Create and download a JSON key file

3. **Configure Environment Variables**:
   - Copy the `client_email` and `private_key` from the JSON file to `.env.local`
   - Get your calendar ID from Google Calendar settings under "Integrate calendar"
   - Add the calendar ID to `.env.local`

4. **Share Your Calendar**:
   - Open Google Calendar settings
   - Find the calendar you want to use for bookings
   - Click "Share with specific people"
   - Add the service account email with "Make changes to events" permission

### Browser Compatibility

- **Supported**: Chrome, Firefox, Edge, Safari (Web Audio API/MediaRecorder)
- **Audio Format**: WebM with Opus codec (fallback to default browser format)
- **Production**: Requires HTTPS (automatically provided by Vercel)
- **Mobile**: Works on mobile browsers with microphone permissions

### Environment Variables

Required variables in `.env.local`:
- `GOOGLE_CLIENT_EMAIL` - Service account email
- `GOOGLE_PRIVATE_KEY` - Service account private key
- `GOOGLE_CALENDAR_ID` - Target calendar ID

These are server-side only and should never be committed to git.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Framer Motion Documentation](https://www.framer.com/motion/)
- [Web Audio API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [MediaRecorder API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [Google Calendar API Documentation](https://developers.google.com/calendar/api)