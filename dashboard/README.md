# DevChronicles Dashboard

A beautiful, modern dashboard for tracking your developer learning journey and productivity insights.

## Features

- **Real-time Stats**: Track bugs fixed, concepts learned, time spent, and total entries
- **Activity Feed**: View your recent browsing and learning activity
- **Category Breakdown**: See how your time is distributed across different development topics
- **Learning Progress**: Monitor your progress in different technologies
- **Export Reports**: Export your data for analysis or sharing
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Setup

### Prerequisites

- Node.js 14 or higher
- npm or yarn package manager

### Installation

1. Navigate to the dashboard directory:
   ```bash
   cd dev-chronicles-dashboard
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

4. Open your browser and go to:
   ```
   http://localhost:3000
   ```

### Development

For development with auto-reload:
```bash
npm run dev
```

## Usage

1. **First Time Setup**: The dashboard will automatically connect to your DevChronicles backend
2. **View Stats**: Your main metrics are displayed in the top cards
3. **Browse Activity**: Recent browsing activity is shown in the activity feed
4. **Export Data**: Use the export button to download your data
5. **Sync Data**: Click sync to refresh your data from the backend

## API Integration

The dashboard connects to the DevChronicles backend at `http://localhost:8000/backend-api` for:
- User authentication
- Stats retrieval
- Activity history
- Data synchronization

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Contributing

This is part of the DevChronicles project. See the main project README for contribution guidelines. 