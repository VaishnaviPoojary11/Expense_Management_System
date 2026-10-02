import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

function ExpenseCalculation() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const groupId = searchParams.get('groupId')

  const [groupName, setGroupName] = useState('')
  const [members, setMembers] = useState([])
  const [expenses, setExpenses] = useState([])
  const [balances, setBalances] = useState([])

  useEffect(() => {
    if (!groupId) return
    loadCalculationData()
  }, [groupId])

  const loadCalculationData = async () => {
    try {
      const [groupsResponse, membersResponse, expensesResponse] =
        await Promise.all([
          fetch('/api/groups'),
          fetch(`/api/groups/${groupId}/members`),
          fetch(`/api/groups/${groupId}/expenses`),
        ])

      const groups = await groupsResponse.json()
      const membersData = await membersResponse.json()
      const expensesData = await expensesResponse.json()

      const group = groups.find(
        (item) => String(item.id) === String(groupId)
      )

      setGroupName(group ? group.name : '')
      setMembers(membersData)
      setExpenses(expensesData)

      calculateBalances(membersData, expensesData)
    } catch (error) {
      console.error('Calculation error:', error)
    }
  }

  const calculateBalances = (membersData, expensesData) => {
    const totals = {}

    membersData.forEach((member) => {
      totals[member.id] = {
        paid: 0,
        share: 0,
      }
    })

    expensesData.forEach((expense) => {
      const paidById = Number(expense.paid_by)

      if (totals[paidById]) {
        totals[paidById].paid += Math.round(
          Number(expense.amount) * 100
        )
      }

      expense.participants.forEach((participant) => {
        const memberId = Number(participant.member_id)

        if (totals[memberId]) {
          totals[memberId].share += Math.round(
            Number(participant.share_amount) * 100
          )
        }
      })
    })

    const result = membersData.map((member) => {
      const paid = totals[member.id].paid
      const share = totals[member.id].share

      return {
        id: member.id,
        name: member.name,
        paid,
        share,
        balance: paid - share,
      }
    })

    setBalances(result)
  }

  const formatMoney = (cents) =>
    `₹${(cents / 100).toFixed(2)}`

  if (!groupId) {
    return (
      <div className="calculation-page">
        <div className="calculation-container">
          <div className="calculation-empty">
            <h1>Expense Calculation</h1>
            <p>No group selected.</p>

            <button
              className="calculation-primary-button"
              onClick={() => navigate('/expenses')}
            >
              ← Go to Expenses
            </button>

            <button
              className="calculation-secondary-button"
              onClick={() => navigate('/')}
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="calculation-page">
      <div className="calculation-container">

        <div className="calculation-header">
          <span className="calculation-label">
            EXPENSE BREAKDOWN
          </span>

          <h1>Expense Calculation</h1>

          <p>
            See how much each member paid, owes, or should receive.
          </p>
        </div>

        <div className="calculation-group-card">
          <span>GROUP</span>
          <h2>{groupName}</h2>
          <p>
            {members.length} members · {expenses.length} expenses
          </p>
        </div>

        {balances.length === 0 ? (
          <div className="calculation-empty-card">
            <div className="calculation-empty-icon">
              ₹
            </div>

            <h3>No calculation available</h3>

            <p>
              Add expenses first to calculate individual balances.
            </p>
          </div>
        ) : (
          <>
            <div className="balance-section-header">
              <div>
                <span className="calculation-label">
                  BALANCES
                </span>

                <h2>Individual Balances</h2>
              </div>
            </div>

            <div className="balance-cards">

              {balances.map((member) => {
                const positive = member.balance > 0
                const negative = member.balance < 0

                return (
                  <div
                    className="balance-card"
                    key={member.id}
                  >
                    <div className="balance-card-top">

                      <div className="balance-member">
                        <div className="balance-avatar">
                          {member.name
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div>
                          <h3>{member.name}</h3>

                          <span>
                            {positive
                              ? 'Should receive'
                              : negative
                                ? 'Needs to pay'
                                : 'Settled'}
                          </span>
                        </div>
                      </div>

                      <div
                        className={`balance-status ${
                          positive
                            ? 'balance-positive'
                            : negative
                              ? 'balance-negative'
                              : 'balance-neutral'
                        }`}
                      >
                        {positive
                          ? '+'
                          : negative
                            ? '-'
                            : ''}
                        {formatMoney(
                          Math.abs(member.balance)
                        )}
                      </div>

                    </div>

                    <div className="balance-details">

                      <div className="balance-detail">
                        <span>Total Paid</span>
                        <strong>
                          {formatMoney(member.paid)}
                        </strong>
                      </div>

                      <div className="balance-detail">
                        <span>Actual Share</span>
                        <strong>
                          {formatMoney(member.share)}
                        </strong>
                      </div>

                    </div>
                  </div>
                )
              })}

            </div>

            <div className="calculation-info">

              <div className="info-item">
                <span className="info-symbol positive-symbol">
                  +
                </span>

                <div>
                  <strong>Positive balance</strong>
                  <p>
                    Member should receive money.
                  </p>
                </div>
              </div>

              <div className="info-item">
                <span className="info-symbol negative-symbol">
                  −
                </span>

                <div>
                  <strong>Negative balance</strong>
                  <p>
                    Member owes money.
                  </p>
                </div>
              </div>

            </div>
          </>
        )}

        <div className="calculation-navigation">

          <button
            className="calculation-primary-button"
            onClick={() =>
              navigate(
                `/settlements?groupId=${groupId}`
              )
            }
          >
            Settlement Logic
            <span>→</span>
          </button>

          <div className="calculation-back-buttons">

            <button
              className="calculation-secondary-button"
              onClick={() =>
                navigate(
                  `/expenses?groupId=${groupId}`
                )
              }
            >
              ← Expenses
            </button>

            <button
              className="calculation-secondary-button"
              onClick={() => navigate('/')}
            >
              ← Back to Home
            </button>

          </div>

        </div>

      </div>
    </div>
  )
}

export default ExpenseCalculation