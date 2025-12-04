import { create } from "zustand";
import { apiCall } from "../utils/api";

export const useTimeStore = create((set, get) => ({
  isClockedIn: false,
  currentTimeEntryId: null,

  isOnBreak: false,
  currentBreakId: null,

  secondsWorkedToday: 0,
  secondsWorkedShift: 0,

  lastServerUpdateTimestamp: null,

  // --- Internal State Setters ---
  _fetchWorkedSeconds: async (session) => {
    if (!session?.access_token) return;

    try {
      // const shiftResp = await apiCall(
      //   session.access_token,
      //   "time-entries/seconds-worked-shift",
      //   "GET"
      // );
      // const todayResp = await apiCall(
      //   session.access_token,
      //   "time-entries/seconds-worked-today",
      //   "GET"
      // );

      // if (shiftResp.success)
      //   set({ secondsWorkedShift: shiftResp.data.seconds });
      // if (todayResp.success)
      //   set({ secondsWorkedToday: todayResp.data.seconds });
      set({
      secondsWorkedShift: 120,
      secondsWorkedToday: 60,
      lastServerUpdateTimestamp: Date.now(),
    });
    } catch (err) {
      console.error("Failed to fetch worked seconds:", err);
    }
  },

  _setClockInState: (entryId) => {
    console.log("⏰ STATE: Clocked In (ID:", entryId, ")");
    set({
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
      secondsWorkedShift: 0,
      lastServerUpdateTimestamp: null,
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

  getSecondsWorkedShift: () => {
    const state = get();
    if (!state.isClockedIn || !state.lastServerUpdateTimestamp)
      return state.secondsWorkedShift;

    // If on break, do NOT add delta
    if (state.isOnBreak) return state.secondsWorkedShift;

    const now = Date.now();
    const delta = Math.floor((now - state.lastServerUpdateTimestamp) / 1000);
    return state.secondsWorkedShift + delta;
  },

  getSecondsWorkedToday: () => {
    const state = get();
    if (!state.isClockedIn || !state.lastServerUpdateTimestamp)
      return state.secondsWorkedToday;

    // If on break, do NOT add delta
    if (state.isOnBreak) return state.secondsWorkedToday;

    const now = Date.now();
    const delta = Math.floor((now - state.lastServerUpdateTimestamp) / 1000);
    return state.secondsWorkedToday + delta;
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

    set({
      isClockedIn: !!entryResp.data?.current_entry,
      currentTimeEntryId: entryResp.data?.current_entry?.id || null,
      isOnBreak: !!breakResp.data?.on_break,
      currentBreakId: breakResp.data?.current_break?.id || null,
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

    if (response.success) {
      get()._setClockInState(response.data.time_entry_id);
      await get()._fetchWorkedSeconds(session);
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

    if (response.success && response.data.break_id) {
      get()._setBreakStartState(response.data.break_id);
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
