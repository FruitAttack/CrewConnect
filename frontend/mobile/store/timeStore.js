import { create } from "zustand";
import { apiCall } from "../utils/api";

export const useTimeStore = create((set, get) => ({
  isClockedIn: false,
  currentTimeEntryId: null,

  isOnBreak: false,
  currentBreakId: null,
  breakStartTime: null,

  secondsWorkedToday: 0,
  secondsWorkedShift: 0,

  lastServerUpdateTimestamp: null,

  // --- Internal State Setters ---
  _fetchWorkedSeconds: async (session) => {
    if (!session?.access_token) return;

    try {
      const shiftResp = await apiCall(
        session.access_token,
        "time-entries/seconds-shift",
        "GET"
      );
      const todayResp = await apiCall(
        session.access_token,
        "time-entries/seconds-today",
        "GET"
      );

      set({
        secondsWorkedShift: shiftResp.success ? shiftResp.data.seconds : 0,
        secondsWorkedToday: todayResp.success ? todayResp.data.seconds : 0,
        lastServerUpdateTimestamp: Date.now(),
      });
    } catch (err) {
      console.error("Failed to fetch worked seconds:", err);
      set({
        secondsWorkedShift: 0,
        secondsWorkedToday: 0,
        lastServerUpdateTimestamp: Date.now(),
      });
    }
  },

  _setClockInState: (entryId) => {
    console.log("⏰ STATE: Clocked In (ID:", entryId, ")");
    set({
      isOnBreak: false,
      isClockedIn: true,
      currentTimeEntryId: entryId,
    });
  },

  _setClockOutState: () => {
    console.log("⏰ STATE: Clocked Out. Resetting all time state.");
    set({
      isClockedIn: false,
      currentTimeEntryId: null,
      isOnBreak: false,
      currentBreakId: null,
      breakStartTime: null,
      secondsWorkedShift: 0,
      lastServerUpdateTimestamp: null,
    });
  },

  _setBreakStartState: (breakId) => {
    console.log("⏰ STATE: Break Started (Break ID:", breakId, ")");
    set({
      isOnBreak: true,
      currentBreakId: breakId,
      breakStartTime: Date.now(),
    });
  },

  _setBreakEndState: () => {
    console.log("⏰ STATE: Break Ended.");
    set({
      isOnBreak: false,
      currentBreakId: null,
      breakStartTime: null,
    });
  },

  getSecondsWorkedShift: () => {
    const state = get();
    if (!state.isClockedIn || !state.lastServerUpdateTimestamp)
      return state.secondsWorkedShift;

    // Timer keeps running even on break (break time is tracked separately)
    const now = Date.now();
    const delta = Math.floor((now - state.lastServerUpdateTimestamp) / 1000);
    return state.secondsWorkedShift + delta;
  },

  getSecondsWorkedToday: () => {
    const state = get();
    if (!state.isClockedIn || !state.lastServerUpdateTimestamp)
      return state.secondsWorkedToday;

    // Timer keeps running even on break (break time is tracked separately)
    const now = Date.now();
    const delta = Math.floor((now - state.lastServerUpdateTimestamp) / 1000);
    return state.secondsWorkedToday + delta;
  },

  getSecondsOnBreak: () => {
    const state = get();
    if (!state.isOnBreak || !state.breakStartTime) return 0;
    
    const now = Date.now();
    return Math.floor((now - state.breakStartTime) / 1000);
  },

  // --- API / ASYNC Actions ---

  // 1. Initial hydration for both clock-in and break status
  hydrateFromServer: async (session) => {
    if (!session?.access_token) return;

    // Get current time entry
    const entryResp = await apiCall(
      session.access_token,
      "time-entries/current",
      "GET"
    );
    const breakResp = await apiCall(
      session.access_token,
      "time-entries/break/current",
      "GET"
    );

    // API returns the entry/break directly in data, not nested
    set({
      isClockedIn: !!entryResp.data,
      currentTimeEntryId: entryResp.data?.id || null,
      isOnBreak: !!breakResp.data,
      currentBreakId: breakResp.data?.id || null,
    });

    // Fetch authoritative worked seconds
    await get()._fetchWorkedSeconds(session);
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

    console.log("Clock-in response:", response);

    if (response.success) {
      // API returns the time entry directly with 'id' field
      get()._setClockInState(response.data.id);
      // Fetch fresh seconds from server
      await get()._fetchWorkedSeconds(session);
    }
    return response;
  },

 // 3. Clock Out Action
doClockOut: async (session, body = {}) => {
  if (!session?.access_token)
    return { success: false, message: "Not authenticated." };

  // If on break, end it first before clocking out
  if (get().isOnBreak) {
    console.log("⏰ Ending break before clock out...");
    await get().doEndBreak(session);
  }

  const response = await apiCall(
    session.access_token,
    "time-entries/clock-out",
    "POST",
    body
  );

  console.log("Clock-out response:", response);

  if (response.success) {
    get()._setClockOutState();
    await get()._fetchWorkedSeconds(session);
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

    // API returns the break directly with 'id' field
    if (response.success && response.data?.id) {
      get()._setBreakStartState(response.data.id);
      await get()._fetchWorkedSeconds(session);
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
      await get()._fetchWorkedSeconds(session);
    }
    return response;
  },
}));