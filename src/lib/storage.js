export const STORAGE_KEY = "expense-atlas-v1";
let hydratePromise = null;

function emptyState() {
  return { events: [], expenses: [], incomes: [] };
}

function hasAnyData(state) {
  return state.events.length > 0 || state.expenses.length > 0 || state.incomes.length > 0;
}

function normalizeState(parsed) {
  if (Array.isArray(parsed.events) && Array.isArray(parsed.expenses)) {
    const normalizedEvents = parsed.events.map((eventItem) => ({
      ...eventItem,
      trackerType: eventItem.trackerType === "profit" ? "profit" : "budget",
      budgetUnknown: Boolean(eventItem.budgetUnknown),
      members: Array.isArray(eventItem.members) ? eventItem.members : []
    }));

    return {
      events: normalizedEvents,
      expenses: parsed.expenses,
      incomes: Array.isArray(parsed.incomes) ? parsed.incomes : []
    };
  }

  if (Array.isArray(parsed.plans) && Array.isArray(parsed.expenses)) {
    const migratedEvents = parsed.plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      location: "",
      trackerType: "budget",
      budget: Number(plan.budget) || 0,
      budgetUnknown: false,
      members: [],
      startDate: plan.startDate,
      endDate: plan.endDate
    }));

    const migratedExpenses = parsed.expenses.map((expense) => ({
      ...expense,
      eventId: expense.eventId || expense.planId
    }));

    return { events: migratedEvents, expenses: migratedExpenses, incomes: [] };
  }

  return emptyState();
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return emptyState();
    }

    const parsed = JSON.parse(raw);
    return normalizeState(parsed);
  } catch {
    return emptyState();
  }
}

export async function hydrateStateFromCloud(setState) {
  if (hydratePromise) {
    return hydratePromise;
  }

  hydratePromise = (async () => {
  try {
    const localState = loadState();
    const { loadFromFirebase, saveToFirebase } = await import("./firebase.js");
    const cloudState = await loadFromFirebase();

    if (!cloudState) {
      // First-time cloud setup: upload existing local data so other devices can read it.
      if (hasAnyData(localState)) {
        await saveToFirebase(localState);
      }
      return;
    }

    const normalized = normalizeState(cloudState);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    setState(normalized);
  } catch (error) {
    console.warn("Failed to load cloud state:", error);
  } finally {
    hydratePromise = null;
  }
  })();

  return hydratePromise;
}

export function persistState(nextState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  
  // Also save to Firebase in the background (non-blocking)
  import("./firebase.js").then(({ saveToFirebase }) => {
    saveToFirebase(nextState).catch(error => {
      console.warn("Failed to sync to Firebase:", error);
      // Still works locally even if Firebase sync fails
    });
  });
}
