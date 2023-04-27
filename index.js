const { google } = require('googleapis');
const { OAuth2 } = google.auth;
const { setIntervalAsync, clearIntervalAsync } = require('set-interval-async/fixed');

// Set up Google OAuth2 credentials
const oAuth2Client = new OAuth2(
  YOUR_CLIENT_ID, // Replace with your client ID
  YOUR_CLIENT_SECRET, // Replace with your client secret
  YOUR_REDIRECT_URI // Replace with your redirect URI
);

// Generate the URL for the consent dialog
const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify'
  ]
});

// Once the user grants permission, exchange the authorization code for access token
const { tokens } =  oAuth2Client.getToken(authorizationCode); // Replace with your authorization code
oAuth2Client.setCredentials(tokens);

// Get the Gmail API client
const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

// Store the IDs of threads that have already been replied to
const repliedThreadIds = new Set();

// Create or retrieve the label for the emails that have been replied to
let labelId = null;
const labelName = 'Replied'; // Replace with the name of the label you want to use
const labels =  gmail.users.labels.list({ userId: 'me' });
const label = labels.data.labels.find(l => l.name === labelName);
if (label) {
  labelId = label.id;
} else {
  const newLabel =  gmail.users.labels.create({
    userId: 'me',
    resource: {
      name: labelName,
      labelListVisibility: 'labelShow',
      messageListVisibility: 'show'
    }
  });
  labelId = newLabel.data.id;
}

// Define a function to check for new emails and send replies
async function checkAndReply() {
  try {
    // Retrieve the list of unread emails
    const messages =  gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread'
    });

    // Loop through each message and check if it's part of a new thread
    for (const message of messages.data.messages) {
      const threadId = message.threadId;
      if (!repliedThreadIds.has(threadId)) {
        // Retrieve the email thread
        const thread =  gmail.users.threads.get({
          userId: 'me',
          id: threadId,
          format: 'full'
        });

        // Check if this is the first email in the thread
        const firstMessage = thread.data.messages[0];
        const from = firstMessage.payload.headers.find(h => h.name === 'From').value;
        if (from !== 'youremail@gmail.com') { // Replace with your email address
          // This is a new thread, so send a reply
          const message = 'Hello! Thank you for your email.';
          const reply =  gmail.users.messages.send({
            userId: 'me',
            resource: {
              threadId: threadId,
              labelIds: [labelId],
              raw: Buffer.from(`From: "Your Name" <youremail@gmail.com>\nTo: ${from}\nSubject: Re: ${firstMessage.payload.headers.find(h => h.name === 'Subject').value}\n\n${message}`).toString('base64')
            }
          });

          // Add the thread ID to the set of replied threads
          repliedThreadIds.add(threadId);
        }
          }
        }