const express = require('express');
const prisma = require('../prisma');
const { authRequired, loadUser } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired, loadUser);

const SCORE_MIN = 1;
const SCORE_MAX = 5;

async function getOpenCycle(companyId) {
  return prisma.feedbackCycle.findFirst({
    where: { companyId, status: 'OPEN' },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });
}

/** Direct reports the current user must review. */
router.get('/team', async (req, res, next) => {
  try {
    const cycle = await getOpenCycle(req.currentUser.companyId);
    const reports = await prisma.user.findMany({
      where: {
        companyId: req.currentUser.companyId,
        managerId: req.currentUser.id,
        role: { not: 'HR' },
      },
      select: {
        id: true,
        name: true,
        email: true,
        title: true,
        role: true,
      },
      orderBy: { name: 'asc' },
    });

    let submissions = [];
    if (cycle) {
      submissions = await prisma.feedbackSubmission.findMany({
        where: {
          cycleId: cycle.id,
          managerId: req.currentUser.id,
          employeeId: { in: reports.map((r) => r.id) },
        },
        select: { employeeId: true, submittedAt: true, id: true },
      });
    }

    const byEmployee = Object.fromEntries(submissions.map((s) => [s.employeeId, s]));

    res.json({
      cycle,
      team: reports.map((r) => ({
        ...r,
        feedbackStatus: byEmployee[r.id] ? 'SUBMITTED' : 'PENDING',
        submissionId: byEmployee[r.id]?.id ?? null,
        submittedAt: byEmployee[r.id]?.submittedAt ?? null,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/parameters', async (_req, res, next) => {
  try {
    const parameters = await prisma.feedbackParameter.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    res.json({ parameters });
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

/** Employee: own feedback history (scores over months, per parameter). */
router.get('/my-history', async (req, res, next) => {
  try {
    const submissions = await prisma.feedbackSubmission.findMany({
      where: {
        employeeId: req.currentUser.id,
        employee: { companyId: req.currentUser.companyId },
      },
      include: {
        cycle: true,
        manager: { select: { id: true, name: true, title: true } },
        scores: {
          include: { parameter: true },
          orderBy: { parameter: { sortOrder: 'asc' } },
        },
      },
      orderBy: [{ cycle: { year: 'desc' } }, { cycle: { month: 'desc' } }],
    });

    const history = submissions.map((s) => ({
      submissionId: s.id,
      cycle: s.cycle,
      manager: s.manager,
      submittedAt: s.submittedAt,
      scores: s.scores.map((sc) => ({
        parameterKey: sc.parameter.key,
        parameterName: sc.parameter.name,
        score: sc.score,
        comment: sc.comment,
      })),
      average:
        s.scores.length > 0
          ? Number(
              (
                s.scores.reduce((sum, sc) => sum + sc.score, 0) / s.scores.length
              ).toFixed(2)
            )
          : null,
    }));

    const parameters = await prisma.feedbackParameter.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    const trendByParameter = parameters.map((p) => ({
      parameterKey: p.key,
      parameterName: p.name,
      points: [...history]
        .reverse()
        .map((h) => {
          const score = h.scores.find((s) => s.parameterKey === p.key);
          return {
            cycleLabel: h.cycle.label,
            year: h.cycle.year,
            month: h.cycle.month,
            score: score?.score ?? null,
          };
        })
        .filter((pt) => pt.score !== null),
    }));

    res.json({ history, trendByParameter });
  } catch (err) {
    next(err);
  }
});

/** Get existing submission for a direct report in the open cycle (for edit/view). */
router.get('/submission/:employeeId', async (req, res, next) => {
  try {
    const employee = await prisma.user.findFirst({
      where: {
        id: req.params.employeeId,
        companyId: req.currentUser.companyId,
        managerId: req.currentUser.id,
      },
    });

    if (!employee) {
      return res.status(404).json({ error: 'Team member not found or not your direct report' });
    }

    const cycle = await getOpenCycle(req.currentUser.companyId);
    if (!cycle) {
      return res.status(404).json({ error: 'No open feedback cycle' });
    }

    const parameters = await prisma.feedbackParameter.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    const submission = await prisma.feedbackSubmission.findUnique({
      where: {
        cycleId_employeeId: { cycleId: cycle.id, employeeId: employee.id },
      },
      include: {
        scores: { include: { parameter: true } },
      },
    });

    res.json({
      cycle,
      employee: {
        id: employee.id,
        name: employee.name,
        title: employee.title,
        email: employee.email,
      },
      parameters,
      submission: submission
        ? {
            id: submission.id,
            submittedAt: submission.submittedAt,
            scores: submission.scores.map((s) => ({
              parameterId: s.parameterId,
              parameterKey: s.parameter.key,
              score: s.score,
              comment: s.comment,
            })),
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
});

/** Create or update feedback for a direct report in the open cycle. */
router.post('/submit', async (req, res, next) => {
  try {
    const { employeeId, scores } = req.body;

    if (!employeeId || !Array.isArray(scores) || scores.length === 0) {
      return res.status(400).json({ error: 'employeeId and scores[] are required' });
    }

    const employee = await prisma.user.findFirst({
      where: {
        id: employeeId,
        companyId: req.currentUser.companyId,
        managerId: req.currentUser.id,
      },
    });

    if (!employee) {
      return res
        .status(403)
        .json({ error: 'You can only submit feedback for your direct reports' });
    }

    const cycle = await getOpenCycle(req.currentUser.companyId);
    if (!cycle) {
      return res.status(400).json({ error: 'No open feedback cycle for your company' });
    }

    const parameters = await prisma.feedbackParameter.findMany();
    const paramById = Object.fromEntries(parameters.map((p) => [p.id, p]));

    if (scores.length !== parameters.length) {
      return res.status(400).json({
        error: `All ${parameters.length} parameters require a score and comment`,
      });
    }

    const seen = new Set();
    for (const item of scores) {
      if (!paramById[item.parameterId]) {
        return res.status(400).json({ error: `Unknown parameter: ${item.parameterId}` });
      }
      if (seen.has(item.parameterId)) {
        return res.status(400).json({ error: 'Duplicate parameter in scores' });
      }
      seen.add(item.parameterId);

      const score = Number(item.score);
      if (!Number.isInteger(score) || score < SCORE_MIN || score > SCORE_MAX) {
        return res.status(400).json({
          error: `Score for each parameter must be an integer from ${SCORE_MIN} to ${SCORE_MAX}`,
        });
      }
      if (!item.comment || !String(item.comment).trim()) {
        return res.status(400).json({
          error: 'Each parameter requires a written explanation (comment)',
        });
      }
    }

    const submission = await prisma.$transaction(async (tx) => {
      const existing = await tx.feedbackSubmission.findUnique({
        where: {
          cycleId_employeeId: { cycleId: cycle.id, employeeId },
        },
      });

      if (existing && existing.managerId !== req.currentUser.id) {
        throw Object.assign(new Error('Feedback already submitted by another manager'), {
          status: 409,
        });
      }

      const saved = existing
        ? await tx.feedbackSubmission.update({
            where: { id: existing.id },
            data: { managerId: req.currentUser.id },
          })
        : await tx.feedbackSubmission.create({
            data: {
              cycleId: cycle.id,
              managerId: req.currentUser.id,
              employeeId,
            },
          });

      await tx.feedbackScore.deleteMany({ where: { submissionId: saved.id } });

      await tx.feedbackScore.createMany({
        data: scores.map((item) => ({
          submissionId: saved.id,
          parameterId: item.parameterId,
          score: Number(item.score),
          comment: String(item.comment).trim(),
        })),
      });

      return tx.feedbackSubmission.findUnique({
        where: { id: saved.id },
        include: {
          scores: {
            include: { parameter: true },
            orderBy: { parameter: { sortOrder: 'asc' } },
          },
          employee: { select: { id: true, name: true, title: true } },
          cycle: true,
        },
      });
    });

    res.status(201).json({ submission });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
});

module.exports = router;
