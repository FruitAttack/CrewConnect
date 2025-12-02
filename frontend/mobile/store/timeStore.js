import { create } from "zustand";
import { apiCall } from "../utils/api";

export const useTimeStore = create((set, get) => ({
  isClockedIn: false,
  currentTimeEntryId: null,
  clockInTimestamp: null,
  isOnBreak: false,
  currentBreakId: null,

  // --- Internal State Setters ---
  _setClockInState: (entryId, timestamp) => {
    console.log("⏰ STATE: Clocked In (ID:", entryId, ") at", timestamp);
    set({
      isClockedIn: true,
      currentTimeEntryId: entryId,
      clockInTimestamp: timestamp,
    });
  },

  _setClockOutState: () => {
    console.log("⏰ STATE: Clocked Out. Resetting all time state.");
    set({
      isClockedIn: false,
      currentTimeEntryId: null,
      clockInTimestamp: null,
      // Also reset break state on clock out
      isOnBreak: false,
      currentBreakId: null,
    });
  },

  _setBreakStartState: (breakId) => {
    console.log("⏰ STATE: Break Started (Break ID:", breakId, ")");
    set({
      isOnBreak: true,
      currentBreakId: breakId,
    });
  },

  _setBreakEndState: () => {
    console.log("⏰ STATE: Break Ended.");
    set({
      isOnBreak: false,
      currentBreakId: null,
    });
  },

  // --- Utility Getters ---
  getElapsedSeconds: () => {
    const state = get(); // Use get() instead of useTimeStore.getState()
    if (!state.clockInTimestamp) {
      return 0;
    }
    const now = Date.now();
    const start = new Date(state.clockInTimestamp).getTime();
    return Math.floor((now - start) / 1000);
  },

  // --- API / ASYNC Actions ---

  // 1. Initial hydration for both clock-in and break status
  hydrateFromServer: async (session) => {
    if (!session?.access_token) return;

    console.log("hydrateFromServer");

    // Fetch current time entry status
    const timeEntryResponse = await apiCall(
      session.access_token,
      "time-entries/current",
      "GET"
    );

    if (
      timeEntryResponse.success &&
      timeEntryResponse.data.current_entry?.clock_in
    ) {
      const entry = timeEntryResponse.data.current_entry;
      get()._setClockInState(entry.id, entry.clock_in);

      // Check break status if clocked in
      const breakResponse = await apiCall(
        session.access_token,
        "time-entries/break/current",
        "GET"
      );

      if (breakResponse.success && breakResponse.data?.on_break) {
        get()._setBreakStartState(breakResponse.data.current_break.id);
      } else {
        get()._setBreakEndState();
      }
    } else {
      get()._setClockOutState();
    }
  },

  // 2. Clock In Action
  doClockIn: async (session, body) => {
    if (!session?.access_token)
      return { success: false, message: "Not authenticated." };

    const response = await apiCall(
      session.access_token,
      "time-entries/clock-in",
      "POST",
      body
    );

    if (response.success) {
      const timeEntryId = response.data?.time_entry_id;
      const startTimestamp = response.data?.clock_in;
      // You should use the timestamp from the server response if provided, otherwise Date.now().
      get()._setClockInState(
        timeEntryId,
        startTimestamp || new Date().toISOString()
      );
    }
    return response;
  },

  // 3. Clock Out Action
  doClockOut: async (session, body) => {
    if (!session?.access_token)
      return { success: false, message: "Not authenticated." };
    const state = get();

    if (!state.currentTimeEntryId)
      return { success: false, message: "Not clocked in." };

    // The API call uses the body for coordinates/notes/etc.
    const response = await apiCall(
      session.access_token,
      "time-entries/clock-out",
      "POST", // Assuming POST with a body is expected for clock-out
      { ...body, time_entry_id: state.currentTimeEntryId }
    );

    if (response.success) {
      get()._setClockOutState();
    }
    return response;
  },

  // 4. Start Break Action
  doStartBreak: async (session) => {
    if (!session?.access_token)
      return { success: false, message: "Not authenticated." };

    const response = await apiCall(
      session.access_token,
      "time-entries/break/start",
      "POST",
      {}
    );

    if (response.success && response.data.break_id) {
      get()._setBreakStartState(response.data.break_id);
    }
    return response;
  },

  // 5. End Break Action
  doEndBreak: async (session) => {
    if (!session?.access_token)
      return { success: false, message: "Not authenticated." };

    const response = await apiCall(
      session.access_token,
      "time-entries/break/end",
      "POST",
      {}
    );

    if (response.success) {
      get()._setBreakEndState();
    }
    return response;
  },
}));
