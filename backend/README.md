# Downloader Backend

This project is a backend service for managing downloads using `ffmpeg`. It provides a RESTful API for downloading media files, checking download progress, and canceling ongoing downloads.

## Features

- **Download Media**: Supports downloading media files from various sources using `ffmpeg`.
- **Progress Tracking**: Allows users to check the progress of their downloads.
- **Cancel Downloads**: Users can cancel ongoing downloads if needed.
- **Metadata Fetching**: Retrieves metadata for media files, including titles and thumbnails.

## Project Structure

```
downloader-backend
├── server.js               # Initializes the Express server and middleware
├── package.json            # npm configuration file
├── .env                    # Environment variables
├── .gitignore              # Git ignore file
├── src                     # Source code directory
│   ├── app.js              # Express application setup
│   ├── routes              # API routes
│   │   ├── index.js        # Main route file
│   │   ├── download.js      # Routes for downloading functionality
│   │   ├── info.js         # Routes for fetching URL information
│   │   ├── progress.js      # Routes for checking download progress
│   │   └── cancel.js       # Routes for canceling downloads
│   ├── controllers         # Route controllers
│   │   ├── downloadController.js  # Logic for download requests
│   │   ├── infoController.js      # Logic for fetching metadata
│   │   ├── progressController.js  # Logic for retrieving download progress
│   │   └── cancelController.js    # Logic for canceling downloads
│   ├── services            # Business logic services
│   │   ├── ffmpegService.js        # Interactions with ffmpeg
│   │   ├── httpFallbackService.js  # HTTP fallback logic for downloads
│   │   └── taskManager.js          # Manages in-memory tasks
│   ├── utils               # Utility functions
│   │   ├── logger.js       # Logging functionality
│   │   └── fetchOpenGraph.js # Fetching OpenGraph metadata
│   └── config              # Configuration settings
│       └── index.js        # Loads and exports configuration
└── README.md               # Project documentation
```

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd downloader-backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory and configure your environment variables.

## Usage

To start the server, run:
```
node server.js
```

The server will listen on the port specified in the `.env` file or default to port 4000.

## API Endpoints

- `POST /api/download`: Start a download.
- `GET /api/progress/:taskId`: Check the progress of a download.
- `POST /api/cancel`: Cancel an ongoing download.
- `POST /api/info`: Fetch metadata for a given URL.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License

This project is licensed under the MIT License.