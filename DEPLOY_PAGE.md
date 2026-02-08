# Deploy Page Feature

## Overview
The Deploy Page is a new built-in feature in Vesper AI that provides a centralized dashboard for monitoring and managing your application deployments.

## Access Methods

There are three ways to access the Deploy Page:

1. **Keyboard Shortcut**: Press `Ctrl+D` (Windows/Linux) or `Cmd+D` (Mac)
2. **Command Palette**: Press `Ctrl+K` to open the Command Palette, then select "Deployment Manager"
3. **Floating Action Button**: Click the FAB in the bottom-right corner and select "Deploy"

## Features

### Deployment Status Monitoring
- **Backend Service**: Monitor your FastAPI backend health status and API URL
- **Frontend App**: Check frontend deployment status and app URL
- **Firebase**: View Firebase connection status and project information

### Status Indicators
Each service displays a color-coded status:
- 🟢 **Green (Healthy/Active/Connected)**: Service is running properly
- 🔴 **Red (Offline/Disconnected)**: Service is unavailable
- ⚪ **Gray (Unknown)**: Status not yet determined

### Quick Actions
- **Refresh Status**: Manually refresh all service status checks
- **View Docs**: Open the DEPLOYMENT.md documentation
- **Close**: Return to chat interface

### Deployment Guide
The page includes an integrated deployment guide with quick reference for:
- Railway (Backend) deployment steps
- Vercel (Frontend) deployment steps
- Command examples for both platforms

## Technical Details

### Health Checks
The Deploy Page automatically performs health checks on:

1. **Backend**: Sends GET request to `/health` endpoint
2. **Firebase**: Checks for configured project ID

### Component Location
- File: `frontend/src/components/DeployPage.jsx`
- Integrated in: `frontend/App.jsx`
- Command Palette: `frontend/src/components/CommandPalette.jsx`
- FAB: `frontend/src/components/FloatingActionButton.jsx`

### State Management
The deploy page uses React state (`deployPageOpen`) to control visibility and renders as a full-screen overlay above the main chat interface.

## Environment Variables Used

The Deploy Page displays information from these environment variables:
- `VITE_API_URL`: Backend API URL
- `VITE_FIREBASE_PROJECT_ID`: Firebase project identifier

## Usage Example

1. Launch Vesper AI application
2. Press `Ctrl+D` to open the Deploy Page
3. View deployment status for all services
4. Click "Refresh Status" to update health checks
5. Click "View Docs" to access detailed deployment instructions
6. Click "Close" to return to chat

## Future Enhancements

Potential improvements for the Deploy Page:
- One-click deployment triggers
- Deployment history and logs
- Real-time deployment progress tracking
- Environment variable management
- Rollback capabilities
- Performance metrics and monitoring

## Troubleshooting

**Deploy page won't open:**
- Ensure you're using the correct keyboard shortcut for your OS
- Try accessing via Command Palette (Ctrl+K)
- Check browser console for JavaScript errors

**Status showing as "Unknown":**
- Check environment variables are configured
- Ensure backend is running and accessible
- Verify Firebase credentials are set up

**Backend showing as "Offline":**
- Confirm backend server is running
- Check `VITE_API_URL` environment variable
- Verify `/health` endpoint exists in backend

## Related Documentation
- [DEPLOYMENT.md](../DEPLOYMENT.md) - Full deployment guide
- [README.md](../README.md) - Project overview
- Backend API documentation - See backend/main.py
