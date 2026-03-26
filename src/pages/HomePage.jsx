import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { currency, parseMembers } from "../lib/format";
import { hydrateStateFromCloud, loadState, persistState } from "../lib/storage";

const MOBILE_BREAKPOINT = 900;

function initialForm() {
  return {
    name: "",
    trackerType: "budget",
    budget: "",
    budgetUnknown: false,
    location: "",
    members: "",
    startDate: "",
    endDate: ""
  };
}

function HomePage() {
  const navigate = useNavigate();
  const [state, setState] = useState(loadState);
  const [form, setForm] = useState(initialForm);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= MOBILE_BREAKPOINT);
  const [showCreateOnMobile, setShowCreateOnMobile] = useState(false);

  const events = state.events;

  const trackerIsBudget = form.trackerType === "budget";

  const handleFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const upsertState = (updater) => {
    setState((prev) => {
      const next = updater(prev);
      persistState(next);
      return next;
    });
  };

  const handleCreateEvent = (event) => {
    event.preventDefault();

    const name = form.name.trim();
    const location = form.location.trim();
    const isBudget = form.trackerType === "budget";
    const unknownBudget = isBudget && form.budgetUnknown;
    const budget = isBudget ? (unknownBudget ? null : Number(form.budget)) : null;

    if (!name || !location || (isBudget && !unknownBudget && budget < 0) || form.startDate > form.endDate) {
      window.alert("Please enter valid event details.");
      return;
    }

    const nextEvent = {
      id: crypto.randomUUID(),
      name,
      location,
      trackerType: form.trackerType,
      budget,
      budgetUnknown: unknownBudget,
      members: parseMembers(form.members),
      startDate: form.startDate,
      endDate: form.endDate
    };

    upsertState((prev) => ({
      ...prev,
      events: [nextEvent, ...prev.events]
    }));

    setForm(initialForm());
    if (isMobile) {
      setShowCreateOnMobile(false);
    }
  };

  const clearAllData = () => {
    const shouldClear = window.confirm("This will remove all events, expenses, and incomes. Continue?");
    if (!shouldClear) {
      return;
    }

    const cleared = { events: [], expenses: [], incomes: [] };
    persistState(cleared);
    setState(cleared);
  };

  const deleteEvent = (eventId) => {
    const shouldDelete = window.confirm("Delete this event and all of its expenses?");
    if (!shouldDelete) {
      return;
    }

    upsertState((prev) => ({
      events: prev.events.filter((eventItem) => eventItem.id !== eventId),
      expenses: prev.expenses.filter((expense) => expense.eventId !== eventId),
      incomes: prev.incomes.filter((income) => income.eventId !== eventId)
    }));
  };

  const eventStats = useMemo(() => {
    const expenseByEvent = new Map();
    const incomeByEvent = new Map();

    state.expenses.forEach((expense) => {
      expenseByEvent.set(expense.eventId, (expenseByEvent.get(expense.eventId) || 0) + expense.amount);
    });

    state.incomes.forEach((income) => {
      incomeByEvent.set(income.eventId, (incomeByEvent.get(income.eventId) || 0) + income.amount);
    });

    return { expenseByEvent, incomeByEvent };
  }, [state.expenses, state.incomes]);

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    hydrateStateFromCloud(setState);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setShowCreateOnMobile(false);
    }
  }, [isMobile]);

  const createEventPanel = (
    <article className="panel glass">
      <h2>Create Event</h2>
      <form className="stack" onSubmit={handleCreateEvent}>
        <label>
          Event Name
          <input name="name" type="text" maxLength="80" required value={form.name} onChange={handleFormChange} />
        </label>

        <label>
          Tracker Type
          <select name="trackerType" required value={form.trackerType} onChange={handleFormChange}>
            <option value="budget">Budget Tracker</option>
            <option value="profit">Profit & Expense Tracker</option>
          </select>
        </label>

        {trackerIsBudget && (
          <div className="field-row">
            <label>
              Budget
              <input
                name="budget"
                type="number"
                min="0"
                step="0.01"
               
                required={!form.budgetUnknown}
                disabled={form.budgetUnknown}
                value={form.budget}
                onChange={handleFormChange}
              />
            </label>
          </div>
        )}

        <label>
          Location
          <input name="location" type="text" maxLength="80" required value={form.location} onChange={handleFormChange} />
        </label>

        {trackerIsBudget && (
          <label className="check-row">
            <input name="budgetUnknown" type="checkbox" checked={form.budgetUnknown} onChange={handleFormChange} />
            Budget unknown for now (edit later)
          </label>
        )}

        <label>
          Members (comma separated)
          <input name="members" type="text" maxLength="300" value={form.members} onChange={handleFormChange} />
        </label>

        <div className="field-row">
          <label>
            Start Date
            <input name="startDate" type="date" required value={form.startDate} onChange={handleFormChange} />
          </label>
          <label>
            End Date
            <input name="endDate" type="date" required value={form.endDate} onChange={handleFormChange} />
          </label>
        </div>

        <button type="submit" className="btn primary">
          Create Event
        </button>
      </form>
    </article>
  );

  const eventListPanel = (
    <article className="panel glass">
      <h2>Event List</h2>
      <div className="event-list">
        {!events.length && <p className="empty">No events yet. Create one to start tracking expenses.</p>}

        {events.map((eventItem) => {
          const eventSpent = eventStats.expenseByEvent.get(eventItem.id) || 0;
          const eventIncome = eventStats.incomeByEvent.get(eventItem.id) || 0;
          const memberCount = (eventItem.members || []).length;
          const membersText = `${memberCount} member${memberCount === 1 ? "" : "s"}`;
          const trackerLabel = eventItem.trackerType === "profit" ? "Profit Tracker" : "Budget Tracker";
          const budgetText =
            eventItem.trackerType === "profit"
              ? `Income ${currency(eventIncome)} • Net ${currency(eventIncome - eventSpent)}`
              : eventItem.budgetUnknown
                ? `Spent ${currency(eventSpent)} • Budget unknown`
                : `${currency(eventSpent)} / ${currency(Number(eventItem.budget) || 0)}`;

          return (
            <article className="event-card glass" key={eventItem.id}>
              <div>
                <p className="event-title">{eventItem.name}</p>
                <p className="event-meta">{`${eventItem.location} • ${trackerLabel} • ${membersText} • ${budgetText}`}</p>
              </div>
              <div className="event-actions">
                <button className="btn primary small" type="button" onClick={() => navigate(`/event/${encodeURIComponent(eventItem.id)}`)}>
                  Open
                </button>
                <button className="btn ghost small" type="button" onClick={() => deleteEvent(eventItem.id)}>
                  Delete
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </article>
  );

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">Expense Tracker</p>
          <h1>Expense Atlas</h1>
          <p className="subhead">Plan event budgets and track spending with a liquid-glass dashboard.</p>
        </div>
        <button onClick={clearAllData} className="btn ghost" type="button">
          Clear Data
        </button>
      </header>

      <section className="panel-grid">
        {isMobile ? (
          <>
            {eventListPanel}
            {!showCreateOnMobile && (
              <button className="btn primary" type="button" onClick={() => setShowCreateOnMobile(true)}>
                Create Event
              </button>
            )}
            {showCreateOnMobile && (
              <>
                {createEventPanel}
                <button className="btn ghost" type="button" onClick={() => setShowCreateOnMobile(false)}>
                  Back to Event List
                </button>
              </>
            )}
          </>
        ) : (
          <>
            {createEventPanel}
            {eventListPanel}
          </>
        )}
      </section>
    </>
  );
}

export default HomePage;
