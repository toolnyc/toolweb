import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import type { CalendarEventParams } from './types';

/**
 * Formats a Date object as local RFC3339 timestamp without timezone designator
 * @param date - The date to format
 * @param includeOffset - Whether to include timezone offset (default: false)
 * @returns Formatted RFC3339 string
 */
function formatLocalRFC3339(date: Date, includeOffset: boolean = false): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  const base = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  
  if (includeOffset) {
    const offset = date.getTimezoneOffset();
    const offsetHours = Math.floor(Math.abs(offset) / 60);
    const offsetMinutes = Math.abs(offset) % 60;
    const offsetSign = offset <= 0 ? '+' : '-';
    const offsetStr = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;
    return `${base}${offsetStr}`;
  }
  
  return base;
}

export async function createConsultationEvent({ transcript, sentiment }: CalendarEventParams): Promise<string> {
  // Validate environment variables
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const calendarId = process.env.GOOGLE_CALENDAR_ID;

  if (!clientEmail || !privateKey || !calendarId) {
    throw new Error('Missing required Google Calendar environment variables');
  }

  // Process private key (replace \n with actual newlines)
  const processedPrivateKey = privateKey.replace(/\\n/g, '\n');

  // Create JWT auth client
  const auth = new JWT({
    email: clientEmail,
    key: processedPrivateKey,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });

  // Initialize Google Calendar API
  const calendar = google.calendar({ version: 'v3', auth });

  // Create a unique request ID for the conference
  const requestId = `consultation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Calculate start time (next business day at 2pm in local timezone)
  // Skip weekends: if tomorrow is Saturday, set to Monday; if Sunday, set to Monday
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Handle weekend skipping
  const dayOfWeek = tomorrow.getDay(); // 0 = Sunday, 6 = Saturday
  if (dayOfWeek === 0) { // Sunday
    tomorrow.setDate(tomorrow.getDate() + 1); // Move to Monday
  } else if (dayOfWeek === 6) { // Saturday
    tomorrow.setDate(tomorrow.getDate() + 2); // Move to Monday
  }
  
  tomorrow.setHours(14, 0, 0, 0); // 2:00 PM

  // Determine the target timezone string once
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  // Calculate end time (30 minutes later)
  const endTime = new Date(tomorrow.getTime() + 30 * 60 * 1000);

  // Create event object
  const event = {
    summary: `Consultation Call - ${sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}`,
    description: `Transcript: ${transcript}\n\nSentiment: ${sentiment}\n\nThis meeting was auto-scheduled based on your voice message. I'll follow up to confirm the time.`,
    start: {
      dateTime: formatLocalRFC3339(tomorrow),
      timeZone: tz,
    },
    end: {
      dateTime: formatLocalRFC3339(endTime),
      timeZone: tz,
    },
    conferenceData: {
      createRequest: {
        requestId,
        conferenceSolutionKey: {
          type: 'hangoutsMeet',
        },
      },
    },
    attendees: [],
  };

  try {
    // Insert the event
    const response = await calendar.events.insert({
      calendarId,
      requestBody: event,
      conferenceDataVersion: 1,
      sendUpdates: 'none',
    });

    if (!response.data.htmlLink) {
      throw new Error('Failed to create calendar event - no link returned');
    }

    return response.data.htmlLink;
  } catch (error) {
    console.error('Google Calendar API error:', error);
    throw new Error(`Failed to create calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
