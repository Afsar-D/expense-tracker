export const STORAGE_KEY = "expense-atlas-v1";

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { events: [], expenses: [], incomes: [] };
    }

    const parsed = JSON.parse(raw);

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

    return { events: [], expenses: [], incomes: [] };
  } catch {
    return { events: [], expenses: [], incomes: [] };
  }
}

export function persistState(nextState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
}
