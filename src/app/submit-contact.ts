import { google } from 'googleapis';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { name, email, phone, hotel, rooms, service, message } = req.body;

  // Basic validation
  if (!name || !phone || !hotel || !service) {
    return res.status(400).json({ message: 'Required fields are missing.' });
  }

  try {
    // Authenticate with Google Sheets API
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'), // Replace \\n with actual newlines
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const range = 'Sheet1!A:H'; // Adjust this to your sheet name and column range

    // Prepare the row data
    const rowData = [
      new Date().toISOString(), // Timestamp
      name,
      email,
      phone,
      hotel,
      rooms,
      service,
      message,
      'New', // Initial Status
    ];

    // Append the row to the Google Sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [rowData],
      },
    });

    return res.status(200).json({ message: 'Form submitted successfully!' });
  } catch (error) {
    console.error('Error submitting form to Google Sheet:', error);
    return res.status(500).json({ message: 'Failed to submit form.', error: (error as Error).message });
  }
}