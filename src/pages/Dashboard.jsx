import { useNavigate } from 'react-router-dom'

function Dashboard() {
  const navigate = useNavigate()

  const sections = [
    {
      title: 'Groups',
      description: 'Create a group and manage its members.',
      path: '/groups',
      icon: '👥',
    },
    {
      title: 'Expenses',
      description: 'Add, edit and manage shared expenses.',
      path: '/expenses',
      icon: '💳',
    },
    {
      title: 'Expense Calculation',
      description: 'View contributions, shares and balances.',
      path: '/calculation',
      icon: '📊',
    },
    {
      title: 'Settlement Logic',
      description: 'See who needs to pay whom.',
      path: '/settlements',
      icon: '🔄',
    },
    {
      title: 'Overview',
      description: 'View the complete group expense summary.',
      path: '/overview',
      icon: '📈',
    },
  ]

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">

        <div className="dashboard-header">
          <h1>Smart Expense Management</h1>

          <div className="dashboard-title-line"></div>

          <p>
            Manage shared expenses, calculate balances,
            and simplify settlements.
          </p>
        </div>

        <div className="dashboard-grid">
          {sections.map((section) => (
            <button
              key={section.title}
              className="dashboard-card"
              onClick={() => navigate(section.path)}
            >
              <div className="dashboard-icon">
                {section.icon}
              </div>

              <div className="dashboard-card-content">
                <h2>{section.title}</h2>

                <p>{section.description}</p>
              </div>

              <span className="dashboard-arrow">
                →
              </span>
            </button>
          ))}
        </div>

      </div>
    </div>
  )
}

export default Dashboard