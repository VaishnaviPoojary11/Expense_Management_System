import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'

import Dashboard from './pages/Dashboard'
import Groups from './pages/Groups'
import Expenses from './pages/Expenses'
import ExpenseCalculation from './pages/ExpenseCalculation'
import Settlements from './pages/Settlements'
import Overview from './pages/Overview'

function AppLayout() {
  const location = useLocation()

  const showNavigation = location.pathname !== '/'

  return (
    <>
      {showNavigation && (
        <nav>
          <Link to="/groups">Groups</Link>
          <Link to="/expenses">Expenses</Link>
          <Link to="/calculation">Expense Calculation</Link>
          <Link to="/settlements">Settlement Logic</Link>
          <Link to="/overview">Overview</Link>
        </nav>
      )}

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/calculation" element={<ExpenseCalculation />} />
        <Route path="/settlements" element={<Settlements />} />
        <Route path="/overview" element={<Overview />} />
      </Routes>
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  )
}

export default App