import type { Presentation } from '../types';

const HISTORY_KEY = 'aina-notebook-history';

/**
 * Retrieves the list of presentations from local storage.
 * @returns {Presentation[]} An array of presentations, or an empty array if none are found or an error occurs.
 */
export const getHistory = (): Presentation[] => {
  try {
    const storedHistory = localStorage.getItem(HISTORY_KEY);
    if (storedHistory) {
      return JSON.parse(storedHistory);
    }
  } catch (error) {
    console.error("Error reading history from local storage:", error);
  }
  return [];
};

/**
 * Saves a list of presentations to local storage.
 * @param {Presentation[]} presentations The array of presentations to save.
 */
const saveHistory = (presentations: Presentation[]): void => {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(presentations));
  } catch (error) {
    console.error("Error saving history to local storage:", error);
  }
};

/**
 * Adds a new presentation to the history and saves it.
 * Presentations are kept in descending chronological order (newest first).
 * @param {Presentation} presentation The new presentation to add.
 * @returns {Presentation[]} The updated list of presentations.
 */
export const addPresentation = (presentation: Presentation): Presentation[] => {
  const currentHistory = getHistory();
  const updatedHistory = [presentation, ...currentHistory];
  saveHistory(updatedHistory);
  return updatedHistory;
};

/**
 * Clears the entire presentation history from local storage.
 */
export const clearHistory = (): void => {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch (error) {
    console.error("Error clearing history from local storage:", error);
  }
};