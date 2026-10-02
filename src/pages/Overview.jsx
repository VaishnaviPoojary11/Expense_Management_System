import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

function Overview() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const groupId = searchParams.get('groupId')

  const [groupName, setGroupName] = useState('')
  const [members, setMembers] = useState([])
  const [expenses, setExpenses] = useState([])
  const [balances, setBalances] = useState([])
  const [settlements, setSettlements] = useState([])
  const [totalExpenses, setTotalExpenses] = useState(0)

  useEffect(() => {
    if (!groupId) return
    loadOverview()
  }, [groupId])

  const loadOverview = async () => {
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
      const membersData = await membersResponse.json()
      const expensesData = await expensesResponse.json()

      const group = groups.find(
        (item) => String(item.id) === String(groupId)
      )

      setGroupName(group ? group.name : '')
      setMembers(membersData)
      setExpenses(expensesData)

      calculateOverview(
        membersData,
        expensesData
      )
    } catch (error) {
      console.error('Overview error:', error)
    }
  }

  const calculateOverview = (
    membersData,
    expensesData
  ) => {
    const totals = {}

    membersData.forEach((member) => {
      totals[member.id] = {
        paid: 0,
        share: 0,
      }
    })

    let total = 0

    expensesData.forEach((expense) => {
      const amount = Math.round(
        Number(expense.amount) * 100
      )

      total += amount

      const payerId = Number(
        expense.paid_by
      )

      if (totals[payerId]) {
        totals[payerId].paid += amount
      }

      expense.participants.forEach(
        (participant) => {
          const memberId = Number(
            participant.member_id
          )

          if (totals[memberId]) {
            totals[memberId].share += Math.round(
              Number(
                participant.share_amount
              ) * 100
            )
          }
        }
      )
    })

    setTotalExpenses(total)

    const balanceData = membersData.map(
      (member) => {
        const paid = totals[member.id].paid
        const share = totals[member.id].share

        return {
          id: member.id,
          name: member.name,
          paid,
          share,
          balance: paid - share,
        }
      }
    )

    setBalances(balanceData)
    calculateSettlements(balanceData)
  }

  const calculateSettlements = (
    balanceData
  ) => {
    const creditors = balanceData
      .filter(
        (member) => member.balance > 0
      )
      .map((member) => ({
        name: member.name,
        amount: member.balance,
      }))
      .sort(
        (a, b) => b.amount - a.amount
      )

    const debtors = balanceData
      .filter(
        (member) => member.balance < 0
      )
      .map((member) => ({
        name: member.name,
        amount: Math.abs(
          member.balance
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
      <div className="overview-page">
        <div className="overview-container">
          <div className="overview-empty">
            <h1>Overview</h1>

            <p>
              No group selected.
            </p>

            <button
              className="overview-primary-button"
              onClick={() =>
                navigate('/groups')
              }
            >
              ← Go to Groups
            </button>

            <button
              className="overview-secondary-button"
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
    <div className="overview-page">
      <div className="overview-container">

        {/* HEADER */}

        <div className="overview-header">
          <span className="overview-label">
            GROUP SUMMARY
          </span>

          <h1>Overview</h1>

          <p>
            Complete summary of your shared
            expenses and balances.
          </p>
        </div>

        {/* GROUP */}

        <div className="overview-group-card">

          <div>
            <span>GROUP</span>

            <h2>{groupName}</h2>

            <p>
              {members.length} members ·{' '}
              {expenses.length} expenses
            </p>
          </div>

          <div className="overview-group-icon">
            ₹
          </div>

        </div>

        {/* SUMMARY CARDS */}

        <div className="overview-summary-grid">

          <div className="overview-summary-card">
            <span>Total Expenses</span>

            <strong>
              {formatMoney(totalExpenses)}
            </strong>

            <small>
              Group spending
            </small>
          </div>

          <div className="overview-summary-card">
            <span>Total Members</span>

            <strong>
              {members.length}
            </strong>

            <small>
              Group members
            </small>
          </div>

          <div className="overview-summary-card">
            <span>Expenses Recorded</span>

            <strong>
              {expenses.length}
            </strong>

            <small>
              Shared expenses
            </small>
          </div>

        </div>

        {/* MEMBER CONTRIBUTIONS */}

        <div className="overview-section">

          <div className="overview-section-header">
            <div>
              <span className="overview-label">
                MEMBER DETAILS
              </span>

              <h2>
                Contributions & Balances
              </h2>
            </div>
          </div>

          {balances.length === 0 ? (
            <div className="overview-empty-card">
              <p>
                No member data available.
              </p>
            </div>
          ) : (
            <div className="overview-member-grid">

              {balances.map((member) => {
                const positive =
                  member.balance > 0

                const negative =
                  member.balance < 0

                return (
                  <div
                    className="overview-member-card"
                    key={member.id}
                  >

                    <div className="overview-member-top">

                      <div className="overview-member-info">

                        <div className="overview-member-avatar">
                          {member.name
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div>
                          <h3>
                            {member.name}
                          </h3>

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
                        className={`overview-balance ${
                          positive
                            ? 'overview-positive'
                            : negative
                              ? 'overview-negative'
                              : 'overview-neutral'
                        }`}
                      >
                        {positive
                          ? '+'
                          : negative
                            ? '-'
                            : ''}
                        {formatMoney(
                          Math.abs(
                            member.balance
                          )
                        )}
                      </div>

                    </div>

                    <div className="overview-member-details">

                      <div>
                        <span>
                          Total Paid
                        </span>

                        <strong>
                          {formatMoney(
                            member.paid
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Actual Share
                        </span>

                        <strong>
                          {formatMoney(
                            member.share
                          )}
                        </strong>
                      </div>

                    </div>

                  </div>
                )
              })}

            </div>
          )}

        </div>

        {/* SETTLEMENTS */}

        <div className="overview-section">

          <div className="overview-section-header">
            <div>
              <span className="overview-label">
                SETTLEMENT STATUS
              </span>

              <h2>
                Suggested Settlements
              </h2>
            </div>

            <span className="overview-settlement-count">
              {settlements.length}
            </span>
          </div>

          {settlements.length === 0 ? (
            <div className="overview-settled-card">

              <div className="overview-settled-icon">
                ✓
              </div>

              <div>
                <h3>
                  All Settled
                </h3>

                <p>
                  No settlement is required
                  for this group.
                </p>
              </div>

            </div>
          ) : (
            <div className="overview-settlement-list">

              {settlements.map(
                (settlement, index) => (
                  <div
                    className="overview-settlement-card"
                    key={index}
                  >

                    <div className="overview-settlement-person">

                      <div className="overview-small-avatar">
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

                    <div className="overview-settlement-arrow">
                      →
                    </div>

                    <div className="overview-settlement-person">

                      <div className="overview-small-avatar">
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

                    <div className="overview-settlement-amount">
                      {formatMoney(
                        settlement.amount
                      )}
                    </div>

                  </div>
                )
              )}

            </div>
          )}

        </div>

        {/* NAVIGATION */}

        <div className="overview-navigation">

          <button
            className="overview-primary-button"
            onClick={() =>
              navigate(
                `/settlements?groupId=${groupId}`
              )
            }
          >
            Settlement Logic
            <span>→</span>
          </button>

          <div className="overview-back-buttons">

            <button
              className="overview-secondary-button"
              onClick={() =>
                navigate(
                  `/expenses?groupId=${groupId}`
                )
              }
            >
              ← Expenses
            </button>

            <button
              className="overview-secondary-button"
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

export default Overview