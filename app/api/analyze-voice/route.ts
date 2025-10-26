export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { analyzeSentiment } from '@/lib/sentiment';
import { createConsultationEvent } from '@/lib/calendar';
import type { AnalyzeVoiceResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { transcript } = body;

    // Validate transcript
    if (!transcript || typeof transcript !== 'string' || transcript.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Transcript is required and cannot be empty' },
        { status: 400 }
      );
    }

    // Analyze sentiment
    let sentimentResult;
    try {
      sentimentResult = analyzeSentiment(transcript);
    } catch (error) {
      console.error('Sentiment analysis failed:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to analyze sentiment' },
        { status: 500 }
      );
    }

    // Create calendar event
    let eventLink;
    try {
      eventLink = await createConsultationEvent({
        transcript,
        sentiment: sentimentResult.sentiment,
      });
    } catch (error) {
      console.error('Calendar creation failed:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create calendar event' },
        { status: 500 }
      );
    }

    // Return success response
    const response: AnalyzeVoiceResponse = {
      success: true,
      eventLink,
      sentiment: sentimentResult.sentiment,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
