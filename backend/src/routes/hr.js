const express = require('express');
const prisma = require('../prisma');
const { authRequired, loadUser, requireRoles } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired, loadUser, requireRoles('HR'));

/**
 * HR completion board for a cycle:
 * every manager with direct reports × each report → submitted or pending.
 */
router.get('/completion', async (req, res, next) => {
  try {
    const companyId = req.currentUser.companyId;
    const { cycleId } = req.query;

    let cycle;
    if (cycleId) {
      cycle = await prisma.feedbackCycle.findFirst({
        where: { id: cycleId, companyId },
      });
    } else {
      cycle = await prisma.feedbackCycle.findFirst({
        where: { companyId, status: 'OPEN' },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      });
    }

    if (!cycle) {
      return res.status(404).json({ error: 'Feedback cycle not found' });
    }

    const managers = await prisma.user.findMany({
      where: {
        companyId,
        directReports: { some: {} },
      },
      select: {
        id: true,
        name: true,
        email: true,
        title: true,
        role: true,
        directReports: {
          // HR accounts are out of the monthly performance review set for the pilot.
          where: { role: { not: 'HR' } },
          select: { id: true, name: true, email: true, title: true },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    const submissions = await prisma.feedbackSubmission.findMany({
      where: { cycleId: cycle.id },
      select: {
        id: true,
        managerId: true,
        employeeId: true,
        submittedAt: true,
      },
    });

    const submittedKeys = new Set(
      submissions.map((s) => `${s.managerId}:${s.employeeId}`)
    );
    const byEmployee = Object.fromEntries(submissions.map((s) => [s.employeeId, s]));

    let expected = 0;
    let completed = 0;
    const pending = [];

    const managerRows = managers
      .filter((manager) => manager.directReports.length > 0)
      .map((manager) => {
      const reports = manager.directReports.map((report) => {
        expected += 1;
        // Unique per employee per cycle — manager of record is the employee's managerId
        const submission = byEmployee[report.id];
        const isDone =
          Boolean(submission) &&
          (submission.managerId === manager.id ||
            submittedKeys.has(`${manager.id}:${report.id}`));

        if (isDone) {
          completed += 1;
        } else {
          pending.push({
            managerId: manager.id,
            managerName: manager.name,
            employeeId: report.id,
            employeeName: report.name,
          });
        }

        return {
          ...report,
          feedbackStatus: isDone ? 'SUBMITTED' : 'PENDING',
          submittedAt: isDone ? submission.submittedAt : null,
        };
      });

      const doneCount = reports.filter((r) => r.feedbackStatus === 'SUBMITTED').length;

      return {
        manager: {
          id: manager.id,
          name: manager.name,
          email: manager.email,
          title: manager.title,
          role: manager.role,
        },
        totalReports: reports.length,
        submittedCount: doneCount,
        pendingCount: reports.length - doneCount,
        isComplete: doneCount === reports.length,
        reports,
      };
    });

    res.json({
      cycle,
      summary: {
        expected,
        completed,
        pending: expected - completed,
        completionRate:
          expected === 0 ? 100 : Number(((completed / expected) * 100).toFixed(1)),
        managersComplete: managerRows.filter((m) => m.isComplete).length,
        managersTotal: managerRows.length,
      },
      pending,
      managers: managerRows,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/cycles', async (req, res, next) => {
  try {
    const cycles = await prisma.feedbackCycle.findMany({
      where: { companyId: req.currentUser.companyId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
    res.json({ cycles });
  } catch (err) {
    next(err);
  }
});

router.get('/directory', async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { companyId: req.currentUser.companyId },
      select: {
        id: true,
        name: true,
        email: true,
        title: true,
        role: true,
        managerId: true,
        manager: { select: { id: true, name: true } },
        _count: { select: { directReports: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.json({
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        title: u.title,
        role: u.role,
        manager: u.manager,
        directReportCount: u._count.directReports,
      })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
