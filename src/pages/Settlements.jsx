import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

function Settlements() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const groupId = searchParams.get('groupId')

  const [groupName, setGroupName] = useState('')
  const [settlements, setSettlements] = useState([])

  useEffect(() => {
    if (!groupId) return
    loadSettlementData()
  }, [groupId])

  const loadSettlementData = async () => {
    try {
      const [
        groupsResponse,
        membersResponse,
        expensesResponse,
      ] = await Promise.all([
        fetch('/api/groups'),
        fetch(`/api/groups/${groupId}/members`),
        fetch(`/api/groups/${groupId}/expenses`),
      ])

      const groups = await groupsResponse.json()
      const members = await membersResponse.json()
      const expenses = await expensesResponse.json()

      const group = groups.find(
        (item) => String(item.id) === String(groupId)
      )

      setGroupName(group ? group.name : '')

      calculateSettlements(
        members,
        expenses
      )
    } catch (error) {
      console.error('Settlement error:', error)
    }
  }

  const calculateSettlements = (
    members,
    expenses
  ) => {
    const balances = {}

    members.forEach((member) => {
      balances[member.id] = 0
    })

    expenses.forEach((expense) => {
      const payerId = Number(expense.paid_by)

      balances[payerId] += Math.round(
        Number(expense.amount) * 100
      )

      expense.participants.forEach(
        (participant) => {
          const memberId = Number(
            participant.member_id
          )

          balances[memberId] -= Math.round(
            Number(participant.share_amount) * 100
          )
        }
      )
    })

    const creditors = members
      .filter(
        (member) =>
          balances[member.id] > 0
      )
      .map((member) => ({
        id: member.id,
        name: member.name,
        amount: balances[member.id],
      }))
      .sort(
        (a, b) => b.amount - a.amount
      )

    const debtors = members
      .filter(
        (member) =>
          balances[member.id] < 0
      )
      .map((member) => ({
        id: member.id,
        name: member.name,
        amount: Math.abs(
          balances[member.id]
        ),
      }))
      .sort(
        (a, b) => b.amount - a.amount
      )

    const result = []

    let creditorIndex = 0
    let debtorIndex = 0

    while (
      creditorIndex < creditors.length &&
      debtorIndex < debtors.length
    ) {
      const creditor =
        creditors[creditorIndex]

      const debtor =
        debtors[debtorIndex]

      const amount = Math.min(
        creditor.amount,
        debtor.amount
      )

      if (amount > 0) {
        result.push({
          from: debtor.name,
          to: creditor.name,
          amount,
        })
      }

      creditor.amount -= amount
      debtor.amount -= amount

      if (creditor.amount === 0) {
        creditorIndex++
      }

      if (debtor.amount === 0) {
        debtorIndex++
      }
    }

    setSettlements(result)
  }

  const formatMoney = (cents) =>
    `₹${(cents / 100).toFixed(2)}`

  if (!groupId) {
    return (
      <div className="settlements-page">
        <div className="settlements-container">
          <div className="settlements-empty">
            <h1>Settlement Logic</h1>

            <p>No group selected.</p>

            <button
              className="settlement-primary-button"
              onClick={() =>
                navigate('/expenses')
              }
            >
              ← Go to Expenses
            </button>

            <button
              className="settlement-secondary-button"
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
    <div className="settlements-page">
      <div className="settlements-container">

        <div className="settlements-header">
          <span className="settlement-label">
            FINAL SETTLEMENT
          </span>

          <h1>Settlement Logic</h1>

          <p>
            See the payments needed to settle all
            outstanding balances.
          </p>
        </div>

        <div className="settlement-group-card">
          <span>GROUP</span>

          <h2>{groupName}</h2>

          <p>
            Suggested payments between members
          </p>
        </div>

        {settlements.length === 0 ? (
          <div className="settlements-empty-card">

            <div className="settlement-success-icon">
              ✓
            </div>

            <h2>All Settled</h2>

            <p>
              No settlement is required for this
              group.
            </p>

          </div>
        ) : (
          <>
            <div className="settlement-section-header">
              <div>
                <span className="settlement-label">
                  SUGGESTED PAYMENTS
                </span>

                <h2>
                  {settlements.length}{' '}
                  {settlements.length === 1
                    ? 'Transaction'
                    : 'Transactions'}
                </h2>
              </div>
            </div>

            <div className="settlement-list">

              {settlements.map(
                (settlement, index) => (
                  <div
                    className="settlement-card"
                    key={index}
                  >

                    <div className="settlement-person">
                      <div className="settlement-avatar">
                        {settlement.from
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div>
                        <span>
                          PAYS
                        </span>

                        <strong>
                          {settlement.from}
                        </strong>
                      </div>
                    </div>

                    <div className="settlement-arrow">
                      →
                    </div>

                    <div className="settlement-person">
                      <div className="settlement-avatar">
                        {settlement.to
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div>
                        <span>
                          RECEIVES
                        </span>

                        <strong>
                          {settlement.to}
                        </strong>
                      </div>
                    </div>

                    <div className="settlement-amount">
                      {formatMoney(
                        settlement.amount
                      )}
                    </div>

                  </div>
                )
              )}

            </div>
          </>
        )}

        <div className="settlement-note">
          <span>✓</span>

          <p>
            These transactions are calculated
            to simplify the settlement process
            by reducing unnecessary payments.
          </p>
        </div>

        <div className="settlement-navigation">

          <button
            className="settlement-primary-button"
            onClick={() =>
              navigate(
                `/overview?groupId=${groupId}`
              )
            }
          >
            Overview
            <span>→</span>
          </button>

          <div className="settlement-back-buttons">

            <button
              className="settlement-secondary-button"
              onClick={() =>
                navigate(
                  `/calculation?groupId=${groupId}`
                )
              }
            >
              ← Expense Calculation
            </button>

            <button
              className="settlement-secondary-button"
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

export default Settlements