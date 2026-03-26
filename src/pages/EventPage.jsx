import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { currency, formatCategory } from "../lib/format";
import { hydrateStateFromCloud, loadState, persistState } from "../lib/storage";

const BASE_CATEGORIES = ["transport", "stay", "food", "tickets", "misc"];
const MOBILE_BREAKPOINT = 900;

function EventPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);

  const [state, setState] = useState(loadState);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= MOBILE_BREAKPOINT);

  const [expenseForm, setExpenseForm] = useState({
    amount: "",
    date: today,
    category: "transport",
    customCategory: "",
    paidBy: "",
    notes: ""
  });

  const [incomeForm, setIncomeForm] = useState({
    amount: "",
    date: today,
    source: "",
    notes: ""
  });

  const [memberName, setMemberName] = useState("");
  const [budgetUnknownEdit, setBudgetUnknownEdit] = useState(false);
  const [budgetEditValue, setBudgetEditValue] = useState("");
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [expandedExpenseId, setExpandedExpenseId] = useState(null);
  const [expandedIncomeId, setExpandedIncomeId] = useState(null);

  const activeEvent = useMemo(() => state.events.find((eventItem) => eventItem.id === id), [state.events, id]);

  const updateState = (updater) => {
    setState((prev) => {
      const next = updater(prev);
      persistState(next);
      return next;
    });
  };

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
      setShowExpenseModal(false);
      setShowIncomeModal(false);
    }
  }, [isMobile]);

  if (!id || !activeEvent) {
    return (
      <section className="panel glass">
        <h2>Event Not Found</h2>
        <p className="subhead">The event may have been deleted.</p>
        <button type="button" className="btn primary" onClick={() => navigate("/")}>Back to Events</button>
      </section>
    );
  }

  const eventExpenses = state.expenses.filter((expense) => expense.eventId === activeEvent.id);
  const eventIncomes = state.incomes.filter((income) => income.eventId === activeEvent.id);

  const totalSpent = eventExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalIncome = eventIncomes.reduce((sum, income) => sum + income.amount, 0);
  const budget = Number(activeEvent.budget) || 0;
  const remaining = activeEvent.budgetUnknown ? null : budget - totalSpent;
  const profit = totalIncome - totalSpent;

  const monthKey = new Date().toISOString().slice(0, 7);
  const spentThisMonth = eventExpenses.filter((expense) => expense.date.startsWith(monthKey)).reduce((sum, expense) => sum + expense.amount, 0);
  const incomeThisMonth = eventIncomes.filter((income) => income.date.startsWith(monthKey)).reduce((sum, income) => sum + income.amount, 0);

  const stats =
    activeEvent.trackerType === "profit"
      ? [
          ["Total Income", currency(totalIncome)],
          ["Total Expenses", currency(totalSpent)],
          ["Profit", currency(profit)],
          ["Income This Month", currency(incomeThisMonth)],
          ["Expenses This Month", currency(spentThisMonth)]
        ]
      : [
          ["Event Budget", activeEvent.budgetUnknown ? "Unknown" : currency(budget)],
          ["Total Spent", currency(totalSpent)],
          ["Remaining", activeEvent.budgetUnknown ? "N/A" : currency(remaining)],
          ["This Month", currency(spentThisMonth)],
          ["Members", String(activeEvent.members.length)]
        ];

  const customOptions = [...new Set(eventExpenses.map((expense) => expense.category).filter((category) => category && !BASE_CATEGORIES.includes(category)))];
  const categoryOptions = ["all", ...BASE_CATEGORIES, ...customOptions];

  useEffect(() => {
    if (!categoryOptions.includes(categoryFilter)) {
      setCategoryFilter("all");
    }
  }, [categoryOptions, categoryFilter]);

  useEffect(() => {
    setBudgetUnknownEdit(Boolean(activeEvent.budgetUnknown));
    setBudgetEditValue(activeEvent.budgetUnknown ? "" : String(Number(activeEvent.budget) || 0));
  }, [activeEvent.budgetUnknown, activeEvent.budget]);

  const filteredExpenses = eventExpenses.filter((expense) => {
    const query = searchInput.trim().toLowerCase();
    const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter;
    const matchesSearch = !query || expense.paidBy.toLowerCase().includes(query) || expense.notes.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  useEffect(() => {
    if (expandedExpenseId && !filteredExpenses.some((expense) => expense.id === expandedExpenseId)) {
      setExpandedExpenseId(null);
    }
  }, [expandedExpenseId, filteredExpenses]);

  useEffect(() => {
    if (expandedIncomeId && !eventIncomes.some((income) => income.id === expandedIncomeId)) {
      setExpandedIncomeId(null);
    }
  }, [expandedIncomeId, eventIncomes]);

  const saveBudget = (event) => {
    event.preventDefault();
    const unknown = budgetUnknownEdit;
    const nextBudget = unknown ? null : Number(budgetEditValue);

    if (!unknown && (Number.isNaN(nextBudget) || nextBudget < 0)) {
      window.alert("Enter a valid budget.");
      return;
    }

    updateState((prev) => ({
      ...prev,
      events: prev.events.map((eventItem) =>
        eventItem.id === activeEvent.id
          ? { ...eventItem, budgetUnknown: unknown, budget: nextBudget }
          : eventItem
      )
    }));
  };

  const addIncome = (event) => {
    event.preventDefault();

    const amount = Number(incomeForm.amount);
    const source = incomeForm.source.trim();
    if (amount < 0 || !source || !incomeForm.date) {
      window.alert("Please fill all required income details.");
      return;
    }

    const nextIncome = {
      id: crypto.randomUUID(),
      eventId: activeEvent.id,
      amount,
      source,
      date: incomeForm.date,
      notes: incomeForm.notes.trim()
    };

    updateState((prev) => ({
      ...prev,
      incomes: [nextIncome, ...prev.incomes]
    }));

    setIncomeForm({ amount: "", date: today, source: "", notes: "" });
    if (isMobile) {
      setShowIncomeModal(false);
    }
  };

  const addMember = (event) => {
    event.preventDefault();
    const newMember = memberName.trim();
    if (!newMember) {
      return;
    }

    const exists = activeEvent.members.some((member) => member.toLowerCase() === newMember.toLowerCase());
    if (exists) {
      window.alert("Member already exists.");
      return;
    }

    updateState((prev) => ({
      ...prev,
      events: prev.events.map((eventItem) =>
        eventItem.id === activeEvent.id
          ? { ...eventItem, members: [...eventItem.members, newMember] }
          : eventItem
      )
    }));

    setMemberName("");
  };

  const removeMember = (memberToRemove) => {
    const shouldRemove = window.confirm(`Remove member "${memberToRemove}" from this event?`);
    if (!shouldRemove) {
      return;
    }

    updateState((prev) => ({
      ...prev,
      events: prev.events.map((eventItem) =>
        eventItem.id === activeEvent.id
          ? { ...eventItem, members: eventItem.members.filter((member) => member !== memberToRemove) }
          : eventItem
      )
    }));
  };

  const addExpense = (event) => {
    event.preventDefault();

    const amount = Number(expenseForm.amount);
    const category = expenseForm.category === "__custom__" ? expenseForm.customCategory.trim().toLowerCase() : expenseForm.category;
    const paidBy = expenseForm.paidBy.trim();

    if (amount < 0 || !expenseForm.date || !paidBy || !category) {
      window.alert("Please fill all required expense details.");
      return;
    }

    const nextExpense = {
      id: crypto.randomUUID(),
      eventId: activeEvent.id,
      amount,
      date: expenseForm.date,
      category,
      paidBy,
      notes: expenseForm.notes.trim()
    };

    updateState((prev) => ({
      ...prev,
      expenses: [nextExpense, ...prev.expenses]
    }));

    setExpenseForm({
      amount: "",
      date: today,
      category: "transport",
      customCategory: "",
      paidBy: "",
      notes: ""
    });

    if (isMobile) {
      setShowExpenseModal(false);
    }
  };

  const deleteExpense = (expenseId) => {
    updateState((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((expense) => expense.id !== expenseId)
    }));
  };

  const deleteIncome = (incomeId) => {
    updateState((prev) => ({
      ...prev,
      incomes: prev.incomes.filter((income) => income.id !== incomeId)
    }));
  };

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">Event Detail</p>
          <h1>{activeEvent.name}</h1>
          <p className="subhead">{`${activeEvent.location} • ${activeEvent.startDate} to ${activeEvent.endDate} • ${activeEvent.trackerType === "profit" ? "Profit Tracker" : "Budget Tracker"}`}</p>
        </div>
        <button onClick={() => navigate("/")} className="btn ghost" type="button">
          Back to Events
        </button>
      </header>

      {isMobile && (
        <section className="mobile-quick-actions">
          <button className="btn accent" type="button" onClick={() => setShowExpenseModal(true)}>
            Add Expense
          </button>
          {activeEvent.trackerType === "profit" && (
            <button className="btn primary" type="button" onClick={() => setShowIncomeModal(true)}>
              Add Income
            </button>
          )}
        </section>
      )}

      {isMobile && showExpenseModal && (
        <section className="mobile-modal-backdrop" role="dialog" aria-modal="true" aria-label="Add Expense">
          <article className="mobile-modal panel glass">
            <div className="mobile-modal-head">
              <h2>Add Expense</h2>
              <button className="btn ghost small" type="button" onClick={() => setShowExpenseModal(false)}>
                Close
              </button>
            </div>
            <form className="stack" onSubmit={addExpense}>
              <div className="field-row">
                <label>
                  Amount
                  <input name="amount" type="number" min="0" step="0.01" required value={expenseForm.amount} onChange={(event) => setExpenseForm((prev) => ({ ...prev, amount: event.target.value }))} />
                </label>
                <label>
                  Date
                  <input name="date" type="date" required value={expenseForm.date} onChange={(event) => setExpenseForm((prev) => ({ ...prev, date: event.target.value }))} />
                </label>
              </div>

              <div className="field-row">
                <label>
                  Category
                  <select name="category" required value={expenseForm.category} onChange={(event) => setExpenseForm((prev) => ({ ...prev, category: event.target.value }))}>
                    <option value="transport">Transport</option>
                    <option value="stay">Stay</option>
                    <option value="food">Food</option>
                    <option value="tickets">Tickets</option>
                    <option value="misc">Misc</option>
                    <option value="__custom__">Custom</option>
                  </select>
                </label>
                <label>
                  Paid By
                  <input list="memberNames-mobile" name="paidBy" type="text" maxLength="40" required value={expenseForm.paidBy} onChange={(event) => setExpenseForm((prev) => ({ ...prev, paidBy: event.target.value }))} />
                  <datalist id="memberNames-mobile">
                    {activeEvent.members.map((member) => (
                      <option value={member} key={member} />
                    ))}
                  </datalist>
                </label>
              </div>

              {expenseForm.category === "__custom__" && (
                <label>
                  Custom Category
                  <input name="customCategory" type="text" maxLength="40" required value={expenseForm.customCategory} onChange={(event) => setExpenseForm((prev) => ({ ...prev, customCategory: event.target.value }))} />
                </label>
              )}

              <label>
                Notes
                <input name="notes" type="text" maxLength="120" value={expenseForm.notes} onChange={(event) => setExpenseForm((prev) => ({ ...prev, notes: event.target.value }))} />
              </label>

              <button type="submit" className="btn accent">
                Save Expense
              </button>
            </form>
          </article>
        </section>
      )}

      {isMobile && showIncomeModal && activeEvent.trackerType === "profit" && (
        <section className="mobile-modal-backdrop" role="dialog" aria-modal="true" aria-label="Add Income">
          <article className="mobile-modal panel glass">
            <div className="mobile-modal-head">
              <h2>Add Income</h2>
              <button className="btn ghost small" type="button" onClick={() => setShowIncomeModal(false)}>
                Close
              </button>
            </div>
            <form className="stack" onSubmit={addIncome}>
              <div className="field-row">
                <label>
                  Amount
                  <input name="amount" type="number" min="0" step="0.01" required value={incomeForm.amount} onChange={(event) => setIncomeForm((prev) => ({ ...prev, amount: event.target.value }))} />
                </label>
                <label>
                  Date
                  <input name="date" type="date" required value={incomeForm.date} onChange={(event) => setIncomeForm((prev) => ({ ...prev, date: event.target.value }))} />
                </label>
              </div>
              <label>
                Source
                <input name="source" type="text" maxLength="80" required value={incomeForm.source} onChange={(event) => setIncomeForm((prev) => ({ ...prev, source: event.target.value }))} />
              </label>
              <label>
                Notes
                <input name="notes" type="text" maxLength="120" value={incomeForm.notes} onChange={(event) => setIncomeForm((prev) => ({ ...prev, notes: event.target.value }))} />
              </label>
              <button className="btn primary" type="submit">
                Add Income
              </button>
            </form>
          </article>
        </section>
      )}

      <section className="summary-grid">
        {stats.map(([label, value], index) => (
          <article key={label} className="metric-card glass" style={{ animationDelay: `${index * 70}ms` }}>
            <p className="metric-label">{label}</p>
            <p
              className="metric-value"
              style={{
                color:
                  label === "Remaining" && !activeEvent.budgetUnknown
                    ? remaining >= 0
                      ? "var(--ok)"
                      : "var(--danger)"
                    : label === "Profit"
                      ? profit >= 0
                        ? "var(--ok)"
                        : "var(--danger)"
                      : undefined
              }}
            >
              {value}
            </p>
          </article>
        ))}
      </section>

      <section className="panel-grid">
        {activeEvent.trackerType === "budget" && (
          <article className="panel glass">
            <h2>Budget</h2>
            <form className="stack" onSubmit={saveBudget}>
              <label className="check-row">
                <input id="budgetUnknownEdit" name="budgetUnknownEdit" type="checkbox" checked={budgetUnknownEdit} onChange={(event) => setBudgetUnknownEdit(event.target.checked)} />
                Budget unknown for now
              </label>
              <label>
                Event Budget
                <input id="budgetEditInput" name="budget" type="number" min="0" step="0.01" required={!budgetUnknownEdit} disabled={budgetUnknownEdit} value={budgetEditValue} onChange={(event) => setBudgetEditValue(event.target.value)} />
              </label>
              <button className="btn primary" type="submit">
                Save Budget
              </button>
            </form>
          </article>
        )}

        {activeEvent.trackerType === "profit" && (
          <article className="panel glass">
            <h2>Income</h2>
            {!isMobile && (
              <form className="stack" onSubmit={addIncome}>
                <div className="field-row">
                  <label>
                    Amount
                    <input name="amount" type="number" min="0" step="0.01" required value={incomeForm.amount} onChange={(event) => setIncomeForm((prev) => ({ ...prev, amount: event.target.value }))} />
                  </label>
                  <label>
                    Date
                    <input name="date" type="date" required value={incomeForm.date} onChange={(event) => setIncomeForm((prev) => ({ ...prev, date: event.target.value }))} />
                  </label>
                </div>
                <label>
                  Source
                  <input name="source" type="text" maxLength="80" required value={incomeForm.source} onChange={(event) => setIncomeForm((prev) => ({ ...prev, source: event.target.value }))} />
                </label>
                <label>
                  Notes
                  <input name="notes" type="text" maxLength="120" value={incomeForm.notes} onChange={(event) => setIncomeForm((prev) => ({ ...prev, notes: event.target.value }))} />
                </label>
                <button className="btn primary" type="submit">
                  Add Income
                </button>
              </form>
            )}

            <div className="table-wrap income-table-wrap">
              <table className="compact-table">
                <thead>
                  <tr>
                    <th>Summary</th>
                    <th>Amount</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {!eventIncomes.length && (
                    <tr>
                      <td colSpan="3" className="empty">No income added yet for this event.</td>
                    </tr>
                  )}
                  {eventIncomes.map((income) => {
                    const isExpanded = expandedIncomeId === income.id;
                    return (
                      <Fragment key={income.id}>
                        <tr
                          className={`transaction-row ${isExpanded ? "expanded" : ""}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => setExpandedIncomeId((prev) => (prev === income.id ? null : income.id))}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setExpandedIncomeId((prev) => (prev === income.id ? null : income.id));
                            }
                          }}
                        >
                          <td data-label="Summary"><span className="summary-cell">{`${income.date} • ${income.source}`}</span></td>
                          <td data-label="Amount" className="amount">{currency(income.amount)}</td>
                          <td data-label="Details">{isExpanded ? "Hide" : "View"}</td>
                        </tr>
                        {isExpanded && (
                          <tr className="transaction-detail-row">
                            <td colSpan="3" className="transaction-detail" data-label="Details">
                              <div className="transaction-meta">
                                <p><strong>Notes:</strong> {income.notes || "-"}</p>
                                <button
                                  className="btn ghost small"
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    deleteIncome(income.id);
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </article>
        )}

        <article className="panel glass">
          <h2>Members</h2>
          <form className="stack" onSubmit={addMember}>
            <div className="field-row">
              <label>
                Member Name
                <input id="memberName" name="memberName" type="text" maxLength="60" required value={memberName} onChange={(event) => setMemberName(event.target.value)} />
              </label>
              <div className="align-end">
                <button className="btn accent" type="submit">
                  Add Member
                </button>
              </div>
            </div>
          </form>
          <div className="member-list">
            {!activeEvent.members.length && <p className="empty left">No members yet. Add names to track who paid.</p>}
            {!!activeEvent.members.length && (
              <div className="member-chips">
                {activeEvent.members.map((member) => (
                  <button className="chip" type="button" key={member} onClick={() => removeMember(member)}>
                    {`${member} x`}
                  </button>
                ))}
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="panel-grid">
        {!isMobile && (
          <article className="panel glass">
            <h2>Add Expense</h2>
            <form className="stack" onSubmit={addExpense}>
              <div className="field-row">
                <label>
                  Amount
                  <input name="amount" type="number" min="0" step="0.01" required value={expenseForm.amount} onChange={(event) => setExpenseForm((prev) => ({ ...prev, amount: event.target.value }))} />
                </label>
                <label>
                  Date
                  <input name="date" type="date" required value={expenseForm.date} onChange={(event) => setExpenseForm((prev) => ({ ...prev, date: event.target.value }))} />
                </label>
              </div>

              <div className="field-row">
                <label>
                  Category
                  <select name="category" required value={expenseForm.category} onChange={(event) => setExpenseForm((prev) => ({ ...prev, category: event.target.value }))}>
                    <option value="transport">Transport</option>
                    <option value="stay">Stay</option>
                    <option value="food">Food</option>
                    <option value="tickets">Tickets</option>
                    <option value="misc">Misc</option>
                    <option value="__custom__">Custom</option>
                  </select>
                </label>
                <label>
                  Paid By
                  <input list="memberNames" name="paidBy" type="text" maxLength="40" required value={expenseForm.paidBy} onChange={(event) => setExpenseForm((prev) => ({ ...prev, paidBy: event.target.value }))} />
                  <datalist id="memberNames">
                    {activeEvent.members.map((member) => (
                      <option value={member} key={member} />
                    ))}
                  </datalist>
                </label>
              </div>

              {expenseForm.category === "__custom__" && (
                <label>
                  Custom Category
                  <input name="customCategory" type="text" maxLength="40" required value={expenseForm.customCategory} onChange={(event) => setExpenseForm((prev) => ({ ...prev, customCategory: event.target.value }))} />
                </label>
              )}

              <label>
                Notes
                <input name="notes" type="text" maxLength="120" value={expenseForm.notes} onChange={(event) => setExpenseForm((prev) => ({ ...prev, notes: event.target.value }))} />
              </label>

              <button type="submit" className="btn accent">
                Save Expense
              </button>
            </form>
          </article>
        )}

        <article className="panel glass">
          <div className="list-head">
            <h2>Expenses</h2>
            <div className="field-row compact two-col">
              <label>
                Category
                <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                  {categoryOptions.map((option) => (
                    <option value={option} key={option}>
                      {option === "all" ? "All" : formatCategory(option)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Search
                <input type="text" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} />
              </label>
            </div>
          </div>

          <div className="table-wrap">
            <table className="compact-table">
              <thead>
                <tr>
                  <th>Summary</th>
                  <th>Amount</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {!filteredExpenses.length && (
                  <tr>
                    <td colSpan="3" className="empty">No expenses yet for this event.</td>
                  </tr>
                )}
                {filteredExpenses.map((expense) => {
                  const isExpanded = expandedExpenseId === expense.id;
                  return (
                    <Fragment key={expense.id}>
                      <tr
                        className={`transaction-row ${isExpanded ? "expanded" : ""}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => setExpandedExpenseId((prev) => (prev === expense.id ? null : expense.id))}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setExpandedExpenseId((prev) => (prev === expense.id ? null : expense.id));
                          }
                        }}
                      >
                        <td data-label="Summary"><span className="summary-cell">{`${expense.date} • ${formatCategory(expense.category)} • ${expense.paidBy}`}</span></td>
                        <td data-label="Amount" className="amount">{currency(expense.amount)}</td>
                        <td data-label="Details">{isExpanded ? "Hide" : "View"}</td>
                      </tr>
                      {isExpanded && (
                        <tr className="transaction-detail-row">
                          <td colSpan="3" className="transaction-detail" data-label="Details">
                            <div className="transaction-meta">
                              <p><strong>Notes:</strong> {expense.notes || "-"}</p>
                              <button
                                className="btn ghost small"
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  deleteExpense(expense.id);
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </>
  );
}

export default EventPage;
