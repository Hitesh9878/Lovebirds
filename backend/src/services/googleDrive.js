import { google } from 'googleapis';
import stream from 'stream';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Method 1: Using service account key file (recommended for local development)
let auth;
try {
  // Construct the absolute path to the service account key
  const keyFilePath = path.resolve(process.cwd(), process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './service-account-key.json');
  
  console.log("Attempting to load key file from:", keyFilePath);
  
  // Check if file exists
  if (!fs.existsSync(keyFilePath)) {
    throw new Error(`Service account key file not found at: ${keyFilePath}`);
  }
  
  auth = new google.auth.GoogleAuth({
    keyFile: keyFilePath,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  
  console.log("✅ Google Auth initialized successfully with service account key");
  
} catch (error) {
  console.error("❌ Failed to initialize Google Auth with service account key:", error.message);
  
  // Method 2: Fallback to using service account key as JSON string (for production)
  try {
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON;
    if (serviceAccountKey) {
      const credentials = JSON.parse(serviceAccountKey);
      auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive'],
      });
      console.log("✅ Google Auth initialized successfully with JSON credentials");
    } else {
      throw new Error("No service account credentials found");
    }
  } catch (jsonError) {
    console.error("❌ Failed to initialize Google Auth with JSON credentials:", jsonError.message);
    throw new Error("Could not initialize Google Drive authentication. Please check your credentials.");
  }
}

// Create an authenticated Google Drive client
const drive = google.drive({ version: 'v3', auth });

/**
 * Test the Google Drive connection
 */
export const testDriveConnection = async () => {
  try {
    const response = await drive.files.list({
      q: `'${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents`,
      pageSize: 1,
      fields: 'files(id, name)',
    });
    console.log("✅ Google Drive connection successful");
    return true;
  } catch (error) {
    console.error("❌ Google Drive connection failed:", error.message);
    
    // Provide specific error guidance
    if (error.message.includes('API has not been used')) {
      console.error("🔧 SOLUTION: Enable the Google Drive API in your Google Cloud Console:");
      console.error("   1. Go to: https://console.developers.google.com/apis/api/drive.googleapis.com/overview");
      console.error("   2. Click 'Enable' button");
      console.error("   3. Wait 2-3 minutes for changes to propagate");
    } else if (error.message.includes('access denied') || error.message.includes('forbidden')) {
      console.error("🔧 SOLUTION: Check your service account permissions:");
      console.error("   1. Ensure service account has 'Editor' role in Google Cloud Console");
      console.error("   2. Share the Google Drive folder with your service account email");
    } else if (error.message.includes('not found')) {
      console.error("🔧 SOLUTION: Check your Google Drive folder ID in environment variables");
    }
    
    return false;
  }
};

/**
 * Uploads an image file (like a profile picture) to a specific Google Drive folder.
 * This function also makes the file publicly viewable.
 * @param {object} fileObject - The file object from multer (containing buffer, mimetype, etc.).
 * @returns {Promise<string|null>} The direct content link for the image.
 */
export const uploadProfilePhotoToDrive = async (fileObject) => {
  const bufferStream = new stream.PassThrough();
  bufferStream.end(fileObject.buffer);

  try {
    const response = await drive.files.create({
      media: {
        mimeType: fileObject.mimetype,
        body: bufferStream,
      },
      requestBody: {
        name: fileObject.originalname,
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
      },
      fields: 'id, webContentLink',
    });

    const fileId = response.data.id;

    // Make the file publicly readable by anyone
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    return response.data.webContentLink;

  } catch (error) {
    console.error('Error uploading image to Google Drive:', error);
    return null;
  }
};

/**
 * Uploads a chat message (as a JSON object) to a specific Google Drive folder or Shared Drive.
 * @param {object} messageContent - The message object (e.g., { text: 'Hello!' }).
 * @param {string} fileName - The desired name for the file (e.g., '1678886400000.json').
 * @returns {Promise<string|null>} The ID of the created file.
 */
export const uploadMessageToDrive = async (messageContent, fileName) => {
    try {
        // Validate inputs
        if (!messageContent) {
            throw new Error('Message content is required');
        }
        if (!fileName) {
            throw new Error('File name is required');
        }
        if (!process.env.GOOGLE_DRIVE_FOLDER_ID) {
            throw new Error('GOOGLE_DRIVE_FOLDER_ID environment variable is not set');
        }

        const jsonString = JSON.stringify(messageContent);
        const bufferStream = new stream.PassThrough();
        bufferStream.end(jsonString);

        console.log(`📤 Uploading message to Google Drive: ${fileName}`);

        // Prepare the request body
        const requestBody = {
            name: fileName,
            parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
        };

        // Add supportsAllDrives for Shared Drive compatibility
        const requestOptions = {
            media: {
                mimeType: 'application/json',
                body: bufferStream,
            },
            requestBody,
            fields: 'id',
            supportsAllDrives: true, // Enable Shared Drive support
        };

        // If using a Shared Drive, add additional parameters
        if (process.env.GOOGLE_SHARED_DRIVE_ID) {
            console.log(`📁 Using Shared Drive: ${process.env.GOOGLE_SHARED_DRIVE_ID}`);
            requestOptions.supportsTeamDrives = true; // Legacy compatibility
            // Note: The parent should be a folder within the shared drive
        }

        const { data } = await drive.files.create(requestOptions);

        console.log(`✅ Message uploaded successfully. File ID: ${data.id}`);
        return data.id;
    } catch (error) {
        console.error('❌ Error uploading message to Google Drive:', error.message);
        
        // Provide specific guidance for common errors
        if (error.message.includes('storage quota')) {
            console.error('🔧 SOLUTION: Service accounts need Shared Drive or OAuth delegation:');
            console.error('   Option 1: Create a Shared Drive and add your service account');
            console.error('   Option 2: Use OAuth delegation instead of service account');
            console.error('   Option 3: Switch to a different storage solution');
        }
        
        throw new Error(`Failed to upload message: ${error.message}`);
    }
};

/**
 * Retrieves and parses the content of a message file from Google Drive.
 * @param {string} fileId - The Google Drive file ID of the message.
 * @returns {Promise<object|null>} The parsed message object.
 */
export const getMessageFromDrive = async (fileId) => {
    try {
        if (!fileId) {
            throw new Error('File ID is required');
        }

        console.log(`📥 Retrieving message from Google Drive: ${fileId}`);

        const response = await drive.files.get({
            fileId: fileId,
            alt: 'media',
        });

        console.log(`✅ Message retrieved successfully from Google Drive`);
        return response.data;
    } catch (error) {
        console.error('❌ Error getting message from Google Drive:', error.message);
        throw new Error(`Failed to retrieve message: ${error.message}`);
    }
};