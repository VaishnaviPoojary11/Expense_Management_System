const express = require('express')
const db = require('./db')
const cors = require('cors')

const app = express()
const PORT = 5000

app.use(express.json())
app.use(cors())

// =========================
// TEST BACKEND
// =========================

app.get('/', (req, res) => {
  res.send('Expense Management Backend is running!')
})


// =========================
// TEST DATABASE
// =========================

app.get('/test-db', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1 AS result')

    res.json(rows)
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: 'Database connection failed'
    })
  }
})


// =========================
// GET ALL GROUPS
// =========================

app.get('/groups', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, name FROM expense_groups ORDER BY id DESC'
    )

    res.json(rows)
  } catch (error) {
    console.error('Get groups error:', error)

    res.status(500).json({
      message: 'Failed to get groups'
    })
  }
})


// =========================
// CREATE GROUP
// =========================

app.post('/groups', async (req, res) => {
  try {
    const { name } = req.body

    if (!name || name.trim() === '') {
      return res.status(400).json({
        message: 'Group name is required'
      })
    }

    const [result] = await db.query(
      'INSERT INTO expense_groups (name) VALUES (?)',
      [name.trim()]
    )

    res.status(201).json({
      message: 'Group created successfully',
      groupId: result.insertId,
      groupName: name.trim()
    })
  } catch (error) {
    console.error('Create group error:', error)

    res.status(500).json({
      message: 'Failed to create group'
    })
  }
})


// =========================
// GET GROUP MEMBERS
// =========================

app.get('/groups/:groupId/members', async (req, res) => {
  try {
    const { groupId } = req.params

    const [rows] = await db.query(
      `SELECT id, name
       FROM members
       WHERE group_id = ?
       ORDER BY id`,
      [groupId]
    )

    res.json(rows)
  } catch (error) {
    console.error('Get members error:', error)

    res.status(500).json({
      message: 'Failed to get members'
    })
  }
})


// =========================
// ADD MEMBER
// =========================

app.post('/groups/:groupId/members', async (req, res) => {
  try {
    const { groupId } = req.params
    const { name } = req.body

    if (!name || name.trim() === '') {
      return res.status(400).json({
        message: 'Member name is required'
      })
    }

    const [result] = await db.query(
      `INSERT INTO members (group_id, name)
       VALUES (?, ?)`,
      [groupId, name.trim()]
    )

    res.status(201).json({
      message: 'Member added successfully',
      memberId: result.insertId,
      memberName: name.trim()
    })
  } catch (error) {
    console.error('Add member error:', error)

    res.status(500).json({
      message: 'Failed to add member'
    })
  }
})


// =========================
// ADD EXPENSE
// =========================

app.post('/groups/:groupId/expenses', async (req, res) => {
  const connection = await db.getConnection()

  try {
    const { groupId } = req.params

    const {
      description,
      amount,
      paidBy,
      participants
    } = req.body

    // Validation
    if (!description || description.trim() === '') {
      return res.status(400).json({
        message: 'Description is required'
      })
    }

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        message: 'Amount must be greater than 0'
      })
    }

    if (!paidBy) {
      return res.status(400).json({
        message: 'Paid by is required'
      })
    }

    if (!participants || participants.length === 0) {
      return res.status(400).json({
        message: 'At least one participant is required'
      })
    }

    // Start transaction
    await connection.beginTransaction()

    // Check participants belong to this group
    const placeholders = participants
      .map(() => '?')
      .join(',')

    const [members] = await connection.query(
      `SELECT id
       FROM members
       WHERE group_id = ?
       AND id IN (${placeholders})`,
      [groupId, ...participants]
    )

    if (members.length !== participants.length) {
      await connection.rollback()

      return res.status(400).json({
        message: 'Invalid participant selected'
      })
    }

    // Check payer belongs to group
    const [payer] = await connection.query(
      `SELECT id
       FROM members
       WHERE id = ?
       AND group_id = ?`,
      [paidBy, groupId]
    )

    if (payer.length === 0) {
      await connection.rollback()

      return res.status(400).json({
        message: 'Invalid payer'
      })
    }

    // Insert expense
    const [expenseResult] = await connection.query(
      `INSERT INTO expenses
       (group_id, description, amount, paid_by)
       VALUES (?, ?, ?, ?)`,
      [
        groupId,
        description.trim(),
        Number(amount),
        paidBy
      ]
    )

    const expenseId = expenseResult.insertId

    // Calculate equal share using cents
    const totalAmountInCents =
      Math.round(Number(amount) * 100)

    const participantCount = participants.length

    const baseShare =
      Math.floor(
        totalAmountInCents / participantCount
      )

    const remainingCents =
      totalAmountInCents -
      baseShare * participantCount

    // Insert participant shares
    for (let i = 0; i < participants.length; i++) {
      let shareInCents = baseShare

      // Distribute remaining cents
      if (i < remainingCents) {
        shareInCents += 1
      }

      const shareAmount =
        (shareInCents / 100).toFixed(2)

      await connection.query(
        `INSERT INTO expense_participants
         (expense_id, member_id, share_amount)
         VALUES (?, ?, ?)`,
        [
          expenseId,
          participants[i],
          shareAmount
        ]
      )
    }

    await connection.commit()

    res.status(201).json({
      message: 'Expense added successfully',
      expenseId
    })

  } catch (error) {
    await connection.rollback()

    console.error(
      'Add expense error:',
      error
    )

    res.status(500).json({
      message: 'Failed to add expense'
    })
  } finally {
    connection.release()
  }
})


// =========================
// GET GROUP EXPENSES
// =========================

app.get('/groups/:groupId/expenses', async (req, res) => {
  try {
    const { groupId } = req.params

    const [expenses] = await db.query(
      `SELECT
        e.id,
        e.description,
        e.amount,
        e.paid_by,
        m.name AS paid_by_name
       FROM expenses e
       JOIN members m
         ON e.paid_by = m.id
       WHERE e.group_id = ?
       ORDER BY e.id DESC`,
      [groupId]
    )

    for (const expense of expenses) {
      const [participants] = await db.query(
        `SELECT
          ep.member_id,
          m.name,
          ep.share_amount
         FROM expense_participants ep
         JOIN members m
           ON ep.member_id = m.id
         WHERE ep.expense_id = ?`,
        [expense.id]
      )

      expense.participants = participants
    }

    res.json(expenses)

  } catch (error) {
    console.error(
      'Get expenses error:',
      error
    )

    res.status(500).json({
      message: 'Failed to get expenses'
    })
  }
})


// =========================
// EDIT EXPENSE
// =========================

app.put('/expenses/:expenseId', async (req, res) => {
  const connection = await db.getConnection()

  try {
    const { expenseId } = req.params

    const {
      description,
      amount,
      paidBy,
      participants
    } = req.body

    // Validation
    if (!description || description.trim() === '') {
      return res.status(400).json({
        message: 'Description is required'
      })
    }

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        message: 'Amount must be greater than 0'
      })
    }

    if (!paidBy) {
      return res.status(400).json({
        message: 'Paid by is required'
      })
    }

    if (!participants || participants.length === 0) {
      return res.status(400).json({
        message: 'At least one participant is required'
      })
    }

    await connection.beginTransaction()

    // Find existing expense
    const [expenseRows] = await connection.query(
      `SELECT id, group_id
       FROM expenses
       WHERE id = ?`,
      [expenseId]
    )

    if (expenseRows.length === 0) {
      await connection.rollback()

      return res.status(404).json({
        message: 'Expense not found'
      })
    }

    const groupId = expenseRows[0].group_id

    // Check participants belong to group
    const placeholders = participants
      .map(() => '?')
      .join(',')

    const [members] = await connection.query(
      `SELECT id
       FROM members
       WHERE group_id = ?
       AND id IN (${placeholders})`,
      [groupId, ...participants]
    )

    if (members.length !== participants.length) {
      await connection.rollback()

      return res.status(400).json({
        message: 'Invalid participant selected'
      })
    }

    // Check payer belongs to group
    const [payer] = await connection.query(
      `SELECT id
       FROM members
       WHERE id = ?
       AND group_id = ?`,
      [paidBy, groupId]
    )

    if (payer.length === 0) {
      await connection.rollback()

      return res.status(400).json({
        message: 'Invalid payer'
      })
    }

    // Update expense
    await connection.query(
      `UPDATE expenses
       SET description = ?,
           amount = ?,
           paid_by = ?
       WHERE id = ?`,
      [
        description.trim(),
        Number(amount),
        paidBy,
        expenseId
      ]
    )

    // Remove old participant shares
    await connection.query(
      `DELETE FROM expense_participants
       WHERE expense_id = ?`,
      [expenseId]
    )

    // Recalculate equal shares
    const totalAmountInCents =
      Math.round(Number(amount) * 100)

    const participantCount =
      participants.length

    const baseShare =
      Math.floor(
        totalAmountInCents /
        participantCount
      )

    const remainingCents =
      totalAmountInCents -
      baseShare * participantCount

    // Insert new participant shares
    for (
      let i = 0;
      i < participants.length;
      i++
    ) {
      let shareInCents = baseShare

      if (i < remainingCents) {
        shareInCents += 1
      }

      const shareAmount =
        (shareInCents / 100).toFixed(2)

      await connection.query(
        `INSERT INTO expense_participants
         (expense_id, member_id, share_amount)
         VALUES (?, ?, ?)`,
        [
          expenseId,
          participants[i],
          shareAmount
        ]
      )
    }

    await connection.commit()

    res.json({
      message: 'Expense updated successfully'
    })

  } catch (error) {
    await connection.rollback()

    console.error(
      'Update expense error:',
      error
    )

    res.status(500).json({
      message: 'Failed to update expense'
    })
  } finally {
    connection.release()
  }
})

app.post('/expenses/:expenseId/update', async (req, res) => {
  const connection = await db.getConnection()

  try {
    const { expenseId } = req.params
    const {
      description,
      amount,
      paidBy,
      participants
    } = req.body

    if (!description || description.trim() === '') {
      return res.status(400).json({
        message: 'Description is required'
      })
    }

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        message: 'Amount must be greater than 0'
      })
    }

    if (!paidBy) {
      return res.status(400).json({
        message: 'Paid by is required'
      })
    }

    if (!participants || participants.length === 0) {
      return res.status(400).json({
        message: 'At least one participant is required'
      })
    }

    await connection.beginTransaction()

    const [expenseRows] = await connection.query(
      `SELECT id, group_id
       FROM expenses
       WHERE id = ?`,
      [expenseId]
    )

    if (expenseRows.length === 0) {
      await connection.rollback()

      return res.status(404).json({
        message: 'Expense not found'
      })
    }

    const groupId = expenseRows[0].group_id

    const [payerRows] = await connection.query(
      `SELECT id
       FROM members
       WHERE id = ?
       AND group_id = ?`,
      [paidBy, groupId]
    )

    if (payerRows.length === 0) {
      await connection.rollback()

      return res.status(400).json({
        message: 'Invalid payer'
      })
    }

    const placeholders = participants
      .map(() => '?')
      .join(',')

    const [memberRows] = await connection.query(
      `SELECT id
       FROM members
       WHERE group_id = ?
       AND id IN (${placeholders})`,
      [groupId, ...participants]
    )

    if (memberRows.length !== participants.length) {
      await connection.rollback()

      return res.status(400).json({
        message: 'Invalid participant selected'
      })
    }

    await connection.query(
      `UPDATE expenses
       SET description = ?,
           amount = ?,
           paid_by = ?
       WHERE id = ?`,
      [
        description.trim(),
        Number(amount),
        Number(paidBy),
        expenseId
      ]
    )

    await connection.query(
      `DELETE FROM expense_participants
       WHERE expense_id = ?`,
      [expenseId]
    )

    const totalAmountInCents =
      Math.round(Number(amount) * 100)

    const participantCount =
      participants.length

    const baseShare = Math.floor(
      totalAmountInCents / participantCount
    )

    const remainingCents =
      totalAmountInCents -
      baseShare * participantCount

    for (let i = 0; i < participants.length; i++) {
      let shareInCents = baseShare

      if (i < remainingCents) {
        shareInCents += 1
      }

      const shareAmount =
        (shareInCents / 100).toFixed(2)

      await connection.query(
        `INSERT INTO expense_participants
         (expense_id, member_id, share_amount)
         VALUES (?, ?, ?)`,
        [
          expenseId,
          Number(participants[i]),
          shareAmount
        ]
      )
    }

    await connection.commit()

    res.json({
      message: 'Expense updated successfully',
      expenseId: Number(expenseId)
    })

  } catch (error) {
    await connection.rollback()

    console.error('Update expense error:', error)

    res.status(500).json({
      message: 'Failed to update expense',
      error: error.message
    })

  } finally {
    connection.release()
  }
})
// =========================
// DELETE EXPENSE
// =========================

app.delete('/expenses/:expenseId', async (req, res) => {
  try {
    const { expenseId } = req.params

    await db.query(
      'DELETE FROM expenses WHERE id = ?',
      [expenseId]
    )

    res.json({
      message: 'Expense deleted successfully'
    })

  } catch (error) {
    console.error(
      'Delete expense error:',
      error
    )

    res.status(500).json({
      message: 'Failed to delete expense'
    })
  }
})


// =========================
// START SERVER
// =========================

app.listen(PORT, () => {
  console.log(
    `Server running on http://localhost:${PORT}`
  )
})