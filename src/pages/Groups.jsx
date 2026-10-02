import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function Groups() {
  const navigate = useNavigate()

  const [groupName, setGroupName] = useState('')
  const [memberName, setMemberName] = useState('')
  const [members, setMembers] = useState([])

  const [groupId, setGroupId] = useState(null)
  const [createdGroup, setCreatedGroup] = useState('')
  const [createdMembers, setCreatedMembers] = useState([])

  const addMember = () => {
    const trimmedName = memberName.trim()

    if (!trimmedName) {
      return
    }

    setMembers((previousMembers) => [
      ...previousMembers,
      {
        id: Date.now(),
        name: trimmedName,
      },
    ])

    setMemberName('')
  }

  const createGroup = async () => {
    if (!groupName.trim()) {
      alert('Please enter a group name')
      return
    }

    if (members.length === 0) {
      alert('Please add at least one member')
      return
    }

    try {
      const groupResponse = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: groupName.trim(),
        }),
      })

      const groupData = await groupResponse.json()

      if (!groupResponse.ok) {
        throw new Error(
          groupData.message || 'Failed to create group'
        )
      }

      const savedMembers = []

      for (const member of members) {
        const memberResponse = await fetch(
          `/api/groups/${groupData.groupId}/members`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: member.name,
            }),
          }
        )

        const memberData = await memberResponse.json()

        if (!memberResponse.ok) {
          throw new Error(
            memberData.message || 'Failed to add member'
          )
        }

        savedMembers.push({
          id: memberData.memberId,
          name: memberData.memberName,
        })
      }

      setGroupId(groupData.groupId)
      setCreatedGroup(groupData.groupName)
      setCreatedMembers(savedMembers)
    } catch (error) {
      console.error(error)
      alert(error.message)
    }
  }

  const goToExpenses = () => {
    navigate(`/expenses?groupId=${groupId}`)
  }

  const goHome = () => {
    navigate('/')
  }

  if (groupId) {
    return (
      <div className="groups-page">
        <div className="groups-container">

          <div className="success-header">
            <div className="success-icon">
              ✓
            </div>

            <h1>Group Created!</h1>

            <p>
              Your group is ready to manage shared expenses.
            </p>
          </div>

          <div className="group-success-card">
            <h2>{createdGroup}</h2>

            <div className="members-title-row">
              <span>Members</span>

              <span className="member-count">
                {createdMembers.length}
              </span>
            </div>

            <div className="member-list">
              {createdMembers.map((member, index) => (
                <div
                  className="member-card member-animation"
                  key={member.id}
                  style={{
                    animationDelay: `${index * 80}ms`,
                  }}
                >
                  <div className="member-avatar">
                    {member.name.charAt(0).toUpperCase()}
                  </div>

                  <span className="member-name">
                    {member.name}
                  </span>

                  <span className="member-check">
                    ✓
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="group-actions">
            <button
              className="group-primary-button"
              onClick={goToExpenses}
            >
              Continue to Expenses
              <span>→</span>
            </button>

            <button
              className="group-secondary-button"
              onClick={goHome}
            >
              ← Back to Home
            </button>
          </div>

        </div>
      </div>
    )
  }

  return (
    <div className="groups-page">
      <div className="groups-container">

        <div className="groups-header">
          <h1>Create Your Group</h1>

          <p>
            Add a group and its members to start
            managing shared expenses.
          </p>
        </div>

        <div className="group-form-card">

          <div className="group-form-section">
            <label htmlFor="groupName">
              Group Name
            </label>

            <input
              id="groupName"
              type="text"
              placeholder="Enter group name"
              value={groupName}
              onChange={(event) =>
                setGroupName(event.target.value)
              }
            />
          </div>

          <div className="group-form-section">
            <label htmlFor="memberName">
              Add Members
            </label>

            <div className="member-input-row">
              <input
                id="memberName"
                type="text"
                placeholder="Enter member name"
                value={memberName}
                onChange={(event) =>
                  setMemberName(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    addMember()
                  }
                }}
              />

              <button
                type="button"
                className="add-member-button"
                onClick={addMember}
              >
                + Add Member
              </button>
            </div>

            <span className="input-hint">
              Press Enter or click Add Member
            </span>
          </div>

          {members.length > 0 ? (
            <div className="members-section">

              <div className="members-title-row">
                <span>
                  Members Added
                </span>

                <span className="member-count">
                  {members.length}
                </span>
              </div>

              <div className="member-list">
                {members.map((member, index) => (
                  <div
                    className="member-card member-animation"
                    key={member.id}
                    style={{
                      animationDelay: `${index * 80}ms`,
                    }}
                  >
                    <div className="member-avatar">
                      {member.name.charAt(0).toUpperCase()}
                    </div>

                    <span className="member-name">
                      {member.name}
                    </span>

                    <span className="member-check">
                      ✓
                    </span>
                  </div>
                ))}
              </div>

            </div>
          ) : (
            <div className="empty-members">
              <strong>
                No members added yet
              </strong>

              <span>
                Add members using the field above
              </span>
            </div>
          )}

          <button
            type="button"
            className="create-group-button"
            onClick={createGroup}
          >
            Create Group
            <span>→</span>
          </button>

        </div>

        <button
          type="button"
          className="back-home-button"
          onClick={goHome}
        >
          ← Back to Home
        </button>

      </div>
    </div>
  )
}

export default Groups