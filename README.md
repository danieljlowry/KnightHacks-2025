# Welcome to Study Buddy!

A Chrome extension designed to help students stay focused during study sessions by monitoring website usage and integrating it with a physcial phone-holding device.

## Features

- **Pomodoro Timer**: Study and break periods with customizable durations
- **Website Monitoring**: Warns users when they visit unauthorized websites during study time
- **Real-time Badge**: Shows remaining time in the extension icon
- **Settings Management**: Customize study and break durations
- **Visual Feedback**: Color-coded timer display (red for study, blue for break)
- **Hardware Integration**: Sends information to Arduino R4 to respond to

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `extension` folder
5. The extension should now appear in your extensions list

## Usage

### Setting Up Allowed Websites

1. Click the extension icon in your browser toolbar
2. Enter up to 3 websites you're allowed to visit during study time
3. Click "Save Websites" to store your preferences

### Configuring Timer Settings

1. Click the settings icon (gear) in the extension popup
2. Set your preferred study time (default: 25 minutes)
3. Set your preferred break time (default: 5 minutes)
4. Note: Break time cannot exceed 50% of study time
5. Click "Save" to apply settings

### Using the Timer

- The timer starts automatically when you first open the extension
- During study periods, you'll be warned if you visit unauthorized websites
- The extension badge shows remaining time in minutes
- Timer automatically transitions between study and break periods
- Use the "Reset Timer" button to restart with current settings

## How It Works

1. **Timer System**: Uses Chrome's alarm API for reliable timing across browser sessions
2. **Website Monitoring**: Tracks tab changes and navigation events
3. **Storage**: Saves settings and timer state using Chrome's local storage
4. **Notifications**: Shows warnings for unauthorized website access during study time
5. **Hardware Integration**: Outputs signals to hardware to respond to

## File Structure

```
extension/
├── manifest.json          # Chrome extension configuration
├── background.js          # Service worker with timer and monitoring logic, hardware integration
├── pages/
│   ├── popup.html        # Main extension interface
│   ├── popup.js          # Popup functionality
│   ├── settings.html     # Settings page
│   └── settings.js       # Settings functionality
├── styling/
│   ├── popup.css         # Main popup styles
│   └── settings.css      # Settings page styles
└── images/               # Extension icons and images
```

## Troubleshooting

### Timer Not Working?
- Check that the extension is enabled in `chrome://extensions/`
- Try refreshing the extension or restarting Chrome
- Use the "Reset Timer" button in the popup

### Notifications Not Appearing?
- Ensure notifications are enabled for Chrome in your system settings
- Check that the extension has notification permissions

### Website Monitoring Issues
- Make sure you've added allowed websites in the popup
- Check that the websites are entered as full URLs (e.g., `https://example.com`)

## Development

This extension was built for KnightHacks 2025 and uses:
- Chrome Extension Manifest V3
- Chrome Alarms API for timer functionality
- Chrome Storage API for data persistence
- Chrome Notifications API for user alerts
- Chrome Tabs API for website monitoring

## License

This project is part of the KnightHacks 2025 hackathon submission.
