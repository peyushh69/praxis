import { getAccessToken } from '../lib/firebase';
import { HabitItem } from '../types';

/**
 * Service to sync completed habits to Google Calendar.
 */

// Helper to format date for Google Calendar API
const formatToISOStringWithOffset = (dateStr: string) => {
  // Assuming dateStr is 'YYYY-MM-DD'
  const date = new Date(dateStr);
  return date.toISOString();
};

export async function addHabitToCalendar(habit: HabitItem, dateStr: string) {
  const token = getAccessToken();
  if (!token) {
    throw new Error('Not authenticated with Google Workspace');
  }

  // Create an event for the given day, making it an all-day event
  const event = {
    summary: `✅ Habit: ${habit.title}`,
    description: 'Logged via Praxis.',
    colorId: '2', // Light green
    start: {
      date: dateStr, // Format: YYYY-MM-DD for all day events
    },
    end: {
      date: dateStr, // Same for single day
    },
  };

  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Failed to add to calendar:', errorData);
    throw new Error('Failed to sync to Google Calendar');
  }

  return response.json();
}
