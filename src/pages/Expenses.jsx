import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

function Expenses() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [groups, setGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState(
    searchParams.get('groupId') || ''
  )

  const [members, setMembers] = useState([])
  const [expenses, setExpenses] = useState([])

  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState('')
  const [participants, setParticipants] = useState([])

  const [editingExpense, setEditingExpense] = useState(null)

  useEffect(() => {
    loadGroups()
  }, [])

  useEffect(() => {
    if (!selectedGroup) {
      setMembers([])
      setExpenses([])
      return
    }

    loadMembers()
    loadExpenses()
    setPaidBy('')
    setParticipants([])
    setEditingExpense(null)
  }, [selectedGroup])

  const loadGroups = async () => {
    try {
      const response = await fetch('/api/groups')
      const data = await response.json()
      setGroups(data)
    } catch (error) {
      console.error('Error loading groups:', error)
    }
  }

  const loadMembers = async () => {
    try {
      const response = await fetch(
        `/api/groups/${selectedGroup}/members`
      )
      const data = await response.json()
      setMembers(data)
    } catch (error) {
      console.error('Error loading members:', error)
    }
  }

  const loadExpenses = async () => {
    try {
      const response = await fetch(
        `/api/groups/${selectedGroup}/expenses`
      )
      const data = await response.json()
      setExpenses(data)
    } catch (error) {
      console.error('Error loading expenses:', error)
    }
  }

  const toggleParticipant = (memberId) => {
    setParticipants((previous) => {
      if (previous.includes(memberId)) {
        return previous.filter((id) => id !== memberId)
      }

      return [...previous, memberId]
    })
  }

  const resetForm = () => {
    setDescription('')
    setAmount('')
    setPaidBy('')
    setParticipants([])
    setEditingExpense(null)
  }

  const saveExpense = async () => {
  if (!selectedGroup) {
    alert('Please select a group')
    return
  }

  if (!description.trim()) {
    alert('Please enter a description')
    return
  }

  if (!amount || Number(amount) <= 0) {
    alert('Please enter a valid amount')
    return
  }

  if (!paidBy) {
    alert('Please select who paid')
    return
  }

  if (participants.length === 0) {
    alert('Please select at least one participant')
    return
  }

  try {

    const url = editingExpense
  ? `http://localhost:5000/expenses/${editingExpense.id}`
  : `/api/groups/${selectedGroup}/expenses`
  
    const method = editingExpense ? 'PUT' : 'POST'

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: description.trim(),
        amount: Number(amount),
        paidBy: Number(paidBy),
        participants: participants.map(Number),
      }),
    })

    const contentType =
      response.headers.get('content-type') || ''

    if (!contentType.includes('application/json')) {
      const responseText = await response.text()

      console.error(
        'Unexpected server response:',
        responseText
      )

      throw new Error(
        `Server returned ${response.status}. Please check that the backend is running on port 5000.`
      )
    }

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.message || 'Failed to save expense'
      )
    }

    await loadExpenses()

    resetForm()
  } catch (error) {
    console.error('Save expense error:', error)
    alert(error.message)
  }
}

  const startEdit = (expense) => {
    setEditingExpense(expense)
    setDescription(expense.description)
    setAmount(expense.amount)
    setPaidBy(String(expense.paid_by))

    setParticipants(
      expense.participants.map(
        (participant) => participant.member_id
      )
    )

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  const deleteExpense = async (expenseId) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this expense?'
    )

    if (!confirmed) {
      return
    }

    try {
      const response = await fetch(
        `/api/expenses/${expenseId}`,
        {
          method: 'DELETE',
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.message || 'Failed to delete expense'
        )
      }

      await loadExpenses()
    } catch (error) {
      console.error(error)
      alert(error.message)
    }
  }

  const goToCalculation = () => {
    if (!selectedGroup) {
      alert('Please select a group first')
      return
    }

    navigate(`/calculation?groupId=${selectedGroup}`)
  }

  return (
    <div className="expenses-page">
      <div className="expenses-container">

        <div className="expenses-header">
          <h1>Manage Expenses</h1>
          <p>
            Add and manage shared expenses for your group.
          </p>
        </div>

        {/* GROUP */}

        <div className="expense-group-card">
          <label htmlFor="groupSelect">
            Select Group
          </label>

          <select
            id="groupSelect"
            value={selectedGroup}
            onChange={(event) =>
              setSelectedGroup(event.target.value)
            }
          >
            <option value="">
              Select a group
            </option>

            {groups.map((group) => (
              <option
                key={group.id}
                value={group.id}
              >
                {group.name}
              </option>
            ))}
          </select>
        </div>

        {selectedGroup && (
          <>
            {/* ADD EXPENSE */}

            <div className="expense-form-card">

              <div className="expense-form-header">
                <div>
                  <span className="expense-form-label">
                    {editingExpense
                      ? 'EDIT EXPENSE'
                      : 'NEW EXPENSE'}
                  </span>

                  <h2>
                    {editingExpense
                      ? 'Edit Expense'
                      : 'Add Expense'}
                  </h2>
                </div>

                <div className="expense-form-icon">
                  ₹
                </div>
              </div>

              <div className="expense-form-grid">

                <div className="expense-field">
                  <label htmlFor="description">
                    Description
                  </label>

                  <input
                    id="description"
                    type="text"
                    placeholder="Dinner, groceries..."
                    value={description}
                    onChange={(event) =>
                      setDescription(event.target.value)
                    }
                  />
                </div>

                <div className="expense-field">
                  <label htmlFor="amount">
                    Total Amount
                  </label>

                  <div className="amount-input-wrapper">
                    <span>₹</span>

                    <input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={amount}
                      onChange={(event) =>
                        setAmount(event.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="expense-field">
                  <label htmlFor="paidBy">
                    Paid By
                  </label>

                  <select
                    id="paidBy"
                    value={paidBy}
                    onChange={(event) =>
                      setPaidBy(event.target.value)
                    }
                  >
                    <option value="">
                      Select member
                    </option>

                    {members.map((member) => (
                      <option
                        key={member.id}
                        value={member.id}
                      >
                        {member.name}
                      </option>
                    ))}
                  </select>
                </div>

              </div>

              {/* PARTICIPANTS */}

              <div className="participants-section">

                <div className="participants-header">
                  <div>
                    <h3>Participants</h3>
                    <p>
                      Select everyone who shares this expense.
                    </p>
                  </div>

                  <span className="participant-count">
                    {participants.length} selected
                  </span>
                </div>

                <div className="participant-grid">
                  {members.map((member) => {
                    const isSelected =
                      participants.includes(member.id)

                    return (
                      <button
                        type="button"
                        key={member.id}
                        className={`participant-card ${
                          isSelected
                            ? 'participant-selected'
                            : ''
                        }`}
                        onClick={() =>
                          toggleParticipant(member.id)
                        }
                      >
                        <span className="participant-avatar">
                          {member.name
                            .charAt(0)
                            .toUpperCase()}
                        </span>

                        <span className="participant-name">
                          {member.name}
                        </span>

                        <span className="participant-check">
                          {isSelected ? '✓' : ''}
                        </span>
                      </button>
                    )
                  })}
                </div>

              </div>

              <div className="expense-form-actions">

                <button
                  className="save-expense-button"
                  onClick={saveExpense}
                >
                  {editingExpense
                    ? 'Update Expense'
                    : 'Add Expense'}

                  <span>→</span>
                </button>

                {editingExpense && (
                  <button
                    className="cancel-expense-button"
                    onClick={resetForm}
                  >
                    Cancel
                  </button>
                )}

              </div>

            </div>

            {/* EXPENSE RECORDS */}

            <div className="expenses-list-section">

              <div className="expenses-list-header">
                <div>
                  <span className="expense-form-label">
                    RECORDS
                  </span>

                  <h2>Expenses</h2>
                </div>

                <span className="expense-count">
                  {expenses.length}
                </span>
              </div>

              {expenses.length === 0 ? (
                <div className="empty-expenses">
                  <div className="empty-expenses-icon">
                    ₹
                  </div>

                  <h3>No expenses yet</h3>

                  <p>
                    Add your first shared expense above.
                  </p>
                </div>
              ) : (
                <div className="expense-cards">

                  {expenses.map((expense) => (
                    <div
                      className="expense-card"
                      key={expense.id}
                    >

                      <div className="expense-card-top">

                        <div className="expense-mini-icon">
                          ₹
                        </div>

                        <div className="expense-card-info">
                          <h3>
                            {expense.description}
                          </h3>

                          <p>
                            Paid by{' '}
                            <strong>
                              {expense.paid_by_name}
                            </strong>
                          </p>
                        </div>

                        <div className="expense-amount">
                          ₹{Number(
                            expense.amount
                          ).toFixed(2)}
                        </div>

                      </div>

                      <div className="expense-card-divider" />

                      <div className="expense-participants-row">

                        <span className="expense-detail-label">
                          Participants
                        </span>

                        <div className="expense-participant-list">
                          {expense.participants.map(
                            (participant) => (
                              <span
                                className="expense-participant-tag"
                                key={participant.member_id}
                              >
                                {participant.name}
                              </span>
                            )
                          )}
                        </div>

                      </div>

                      <div className="expense-card-actions">

                        <button
                          className="edit-expense-button"
                          onClick={() =>
                            startEdit(expense)
                          }
                        >
                          Edit
                        </button>

                        <button
                          className="delete-expense-button"
                          onClick={() =>
                            deleteExpense(expense.id)
                          }
                        >
                          Delete
                        </button>

                      </div>

                    </div>
                  ))}

                </div>
              )}

            </div>

            <div className="expense-navigation">
              <button
                className="next-calculation-button"
                onClick={goToCalculation}
              >
                Expense Calculation
                <span>→</span>
              </button>
            </div>
          </>
        )}

        <button
          className="expenses-back-home"
          onClick={() => navigate('/')}
        >
          ← Back to Home
        </button>

      </div>
    </div>
  )
}

export default Expenses