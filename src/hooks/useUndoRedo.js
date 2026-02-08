import { useState, useCallback } from 'react';

export default function useUndoRedo(initialState) {
  // History is an array of state snapshots
  const [history, setHistory] = useState([initialState]);
  // Index points to where we are in the timeline
  const [index, setIndex] = useState(0);

  // Function to save a new state (e.g., when you drop a guest)
  const setContent = useCallback((newState) => {
    setHistory((prev) => {
      // If we are in the middle of the timeline and make a change, 
      // we discard the "future" (standard Undo/Redo behavior)
      const newHistory = prev.slice(0, index + 1);
      return [...newHistory, newState];
    });
    setIndex((prev) => prev + 1);
  }, [index]);

  // Go back one step
  const undo = useCallback(() => {
    setIndex((prev) => Math.max(0, prev - 1));
  }, []);

  // Go forward one step
  const redo = useCallback(() => {
    setIndex((prev) => Math.min(history.length - 1, prev + 1));
  }, [history]);

  // Reset (e.g., when loading a new plan)
  const reset = useCallback((newState) => {
    setHistory([newState]);
    setIndex(0);
  }, []);

  return {
    state: history[index],
    setContent,
    undo,
    redo,
    canUndo: index > 0,
    canRedo: index < history.length - 1,
    reset
  };
}