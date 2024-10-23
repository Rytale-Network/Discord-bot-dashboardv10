# Discord Bot Control Panel

A modern, feature-rich desktop application for managing Discord bots. Built with Electron and Discord.js, this control panel provides an intuitive interface for monitoring and controlling your Discord bot.

## Features

### Bot Management
- Real-time bot status monitoring
- Start/Stop/Restart bot controls
- Server list with detailed statistics
- Command management interface
- Auto-restart capability

### Dashboard
- Live status indicators
- Server count and member statistics
- Quick action buttons
- Real-time updates

### Server Management
- List of all servers the bot is in
- Detailed server information
- Member count tracking
- Role and channel information
- Server-specific settings

### Console & Logging
- Real-time log viewing
- Log level filtering (Info, Warning, Error, Debug)
- Text search functionality
- Auto-scroll option
- Export logs to file
- Save logs with filtering options
- Log file management

## Project Structure

```plaintext
discord-bot-frontend/
├── src/
│   ├── app/                  # Electron application
│   │   ├── main.js          # Main process
│   │   ├── preload.js       # Preload script
│   │   ├── renderer/        # Frontend UI
│   │   │   ├── app.js
│   │   │   ├── index.html
│   │   │   └── modules/     # UI components
│   │   │       ├── console.js
│   │   │       ├── servers.js
│   │   │       ├── settings.js
│   │   │       ├── status.js
│   │   │       └── navigation.js
│   │   ├── services/        # Application services
│   │   └── styles/          # CSS modules
│   │       ├── base.css
│   │       ├── console.css
│   │       ├── dashboard.css
│   │       ├── servers.css
│   │       ├── settings.css
│   │       └── sidebar.css
│   └── bot/                 # Discord bot
│       ├── index.js         # Bot entry
│       └── core/            # Bot core modules
│           ├── BotManager.js
│           ├── CommandManager.js
│           ├── EventManager.js
│           └── LogManager.js
├── docs/                    # Documentation
│   └── images/             # Screenshots
├── .env.example            # Environment template
├── package.json            # Dependencies
└── README.md              # Documentation
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/rytale/discord-bot-dashboardv10.git
cd discord-bot-frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Configure your Discord bot token in `.env`:
```
DISCORD_BOT_TOKEN=your_bot_token_here
```

## Usage

### Running the Application

Start the application in development mode:
```bash
npm start
```

Run the bot without the UI:
```bash
npm run bot
```

### Bot Configuration

1. Through the UI:
   - Go to Settings
   - Enter your bot token
   - Configure other settings as needed
   - Click Save

2. Through environment variables:
   - Set `DISCORD_BOT_TOKEN` in `.env`
   - Set other configuration options as needed

### Log Management

The application provides comprehensive logging features:

1. Viewing Logs:
   - Real-time log display in the console
   - Filter by log level
   - Search functionality
   - Auto-scroll option

2. Exporting Logs:
   - Click "Export" in the console
   - Select log level and time range
   - Logs are saved to Downloads folder

3. Saving Logs:
   - Click "Save" in the console
   - Choose filtering options
   - Logs are saved to application's log directory

## Development

### Architecture

- **Main Process**: Handles system operations and bot communication
- **Renderer Process**: Manages UI and user interactions
- **Bot Core**: Discord.js bot implementation
- **IPC Bridge**: Communication between processes

### Styling

CSS is organized into modules:
- `base.css`: Core styles and variables
- `sidebar.css`: Navigation styles
- `dashboard.css`: Dashboard components
- `settings.css`: Settings panel
- `servers.css`: Server list and details
- `console.css`: Console and logging UI

### Adding Features

1. Create new module in `src/app/renderer/modules/`
2. Add styles in `src/app/styles/`
3. Register in `app.js`
4. Add IPC handlers in `main.js` if needed

### Troubleshooting

1. **Bot Won't Start**
   - Check if token is valid in settings
   - Verify .env file configuration
   - Check console for error messages
   - Ensure no other instances are running

2. **UI Not Responding**
   - Check DevTools console for errors
   - Verify all modules are loaded
   - Try clearing application cache
   - Restart the application

3. **Logs Not Saving**
   - Check write permissions for log directory
   - Verify disk space availability
   - Check console for file system errors

4. **Connection Issues**
   - Verify internet connection
   - Check Discord API status
   - Ensure bot token has proper permissions
   - Check firewall settings

### Development Tips

1. **Hot Reloading**
   - Use `npm run dev` for development
   - Changes to renderer process reload automatically
   - Restart app for main process changes

2. **Debugging**
   - Use Chrome DevTools (View > Toggle Developer Tools)
   - Check main process logs in terminal
   - Use logger.debug() for detailed logging
   - Enable verbose mode in settings

3. **Testing**
   - Run unit tests: `npm test`
   - Test bot commands separately
   - Verify UI components in isolation
   - Test across different platforms

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

### Coding Standards

- Use ES6+ features
- Follow modular design patterns
- Add comments for complex logic
- Include unit tests for new features
- Update documentation as needed

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Discord.js team for the excellent bot framework
- Electron team for the desktop application framework
- Looking forward to future contributors! Join us in improving this project.

## Get Involved

This is an active project and we welcome contributions! Whether you're fixing bugs, adding features, or improving documentation, check out our issues page to get started.

Join our growing community of developers and help make this Discord bot control panel even better!
