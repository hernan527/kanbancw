const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DEFAULT_STAGES = ['Nuevo', 'Contactado', 'Cotizado', 'Negociación', 'Cierre'];
const DEFAULT_COLORS = ['#6366f1', '#3b82f6', '#f59e0b', '#f97316', '#10b981'];

// GET /api/funnels
router.get('/', async (req, res) => {
  try {
    const funnels = await prisma.funnel.findMany({
      where: { activo: true },
      include: {
        stages: { orderBy: { orden: 'asc' } },
        _count: { select: { leads: true } }
      },
      orderBy: { createdAt: 'asc' }
    });
    res.json({ success: true, data: funnels });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/funnels/:id
router.get('/:id', async (req, res) => {
  try {
    const funnel = await prisma.funnel.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        stages: { orderBy: { orden: 'asc' } },
        leads: {
          include: {
            stage: true,
            history: { orderBy: { enteredAt: 'desc' }, take: 10 }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    if (!funnel) return res.status(404).json({ success: false, error: 'Funnel no encontrado' });
    res.json({ success: true, data: funnel });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/funnels
router.post('/', async (req, res) => {
  try {
    const { nombre, descripcion, defaultStages } = req.body;
    if (!nombre) return res.status(400).json({ success: false, error: 'nombre es requerido' });

    const stageNames = defaultStages || DEFAULT_STAGES;

    const funnel = await prisma.$transaction(async (tx) => {
      const f = await tx.funnel.create({ data: { nombre, descripcion } });
      await tx.stage.createMany({
        data: stageNames.map((name, i) => ({
          funnelId: f.id,
          nombre: name,
          orden: i,
          color: DEFAULT_COLORS[i] || '#6366f1'
        }))
      });
      return tx.funnel.findUnique({
        where: { id: f.id },
        include: { stages: { orderBy: { orden: 'asc' } } }
      });
    });

    res.status(201).json({ success: true, data: funnel });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/funnels/:id
router.put('/:id', async (req, res) => {
  try {
    const { nombre, descripcion, activo } = req.body;
    const funnel = await prisma.funnel.update({
      where: { id: parseInt(req.params.id) },
      data: { nombre, descripcion, activo },
      include: { stages: { orderBy: { orden: 'asc' } } }
    });
    res.json({ success: true, data: funnel });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/funnels/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    // Unlink leads before cascade delete
    await prisma.lead.updateMany({
      where: { funnelId: id },
      data: { funnelId: null, stageId: null }
    });
    await prisma.funnel.delete({ where: { id } });
    res.json({ success: true, mensaje: 'Funnel eliminado' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── STAGES ───────────────────────────────────────────────────────────────────

// POST /api/funnels/:funnelId/stages
router.post('/:funnelId/stages', async (req, res) => {
  try {
    const funnelId = parseInt(req.params.funnelId);
    const { nombre, color } = req.body;
    if (!nombre) return res.status(400).json({ success: false, error: 'nombre es requerido' });

    const last = await prisma.stage.findFirst({
      where: { funnelId },
      orderBy: { orden: 'desc' }
    });
    const orden = last ? last.orden + 1 : 0;

    const stage = await prisma.stage.create({
      data: { funnelId, nombre, orden, color: color || '#6366f1' }
    });
    res.status(201).json({ success: true, data: stage });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/funnels/:funnelId/stages/:id
router.patch('/:funnelId/stages/:id', async (req, res) => {
  try {
    const { nombre, color } = req.body;
    const stage = await prisma.stage.update({
      where: { id: parseInt(req.params.id) },
      data: { nombre, color }
    });
    res.json({ success: true, data: stage });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/funnels/:funnelId/stages/:id
router.delete('/:funnelId/stages/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const leadsCount = await prisma.lead.count({ where: { stageId: id } });
    if (leadsCount > 0) {
      return res.status(400).json({
        success: false,
        error: `La columna tiene ${leadsCount} leads. Muévelos primero.`
      });
    }
    await prisma.stage.delete({ where: { id } });
    res.json({ success: true, mensaje: 'Columna eliminada' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/funnels/:funnelId/stages/reorder
router.put('/:funnelId/stages/reorder', async (req, res) => {
  try {
    const funnelId = parseInt(req.params.funnelId);
    const { orden } = req.body; // array of stageIds in desired order

    if (!Array.isArray(orden)) {
      return res.status(400).json({ success: false, error: 'orden debe ser un array de IDs' });
    }

    await prisma.$transaction(
      orden.map((stageId, index) =>
        prisma.stage.update({
          where: { id: stageId },
          data: { orden: index }
        })
      )
    );

    const stages = await prisma.stage.findMany({
      where: { funnelId },
      orderBy: { orden: 'asc' }
    });
    res.json({ success: true, data: stages });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── STATS ────────────────────────────────────────────────────────────────────

// GET /api/funnels/:id/stats
router.get('/:id/stats', async (req, res) => {
  try {
    const funnelId = parseInt(req.params.id);

    const [stages, leads] = await Promise.all([
      prisma.stage.findMany({ where: { funnelId }, orderBy: { orden: 'asc' } }),
      prisma.lead.findMany({
        where: { funnelId },
        include: { history: { where: { exitedAt: null } } }
      })
    ]);

    const totalLeads = leads.length;
    const scored = leads.filter(l => l.ai_score != null);
    const avgScore = scored.length
      ? Math.round(scored.reduce((s, l) => s + l.ai_score, 0) / scored.length)
      : null;
    const totalValue = leads.reduce((s, l) => s + (parseFloat(l.ai_precio_sugerido) || 0), 0);

    const lastStage = stages[stages.length - 1];
    const closedCount = lastStage ? leads.filter(l => l.stageId === lastStage.id).length : 0;
    const conversionRate = totalLeads > 0 ? Math.round((closedCount / totalLeads) * 100) : 0;

    const byStage = stages.map(stage => {
      const stageLeads = leads.filter(l => l.stageId === stage.id);
      const sc = stageLeads.filter(l => l.ai_score != null);
      return {
        stageId: stage.id,
        nombre: stage.nombre,
        color: stage.color,
        count: stageLeads.length,
        avgScore: sc.length ? Math.round(sc.reduce((s, l) => s + l.ai_score, 0) / sc.length) : null,
        totalValue: stageLeads.reduce((s, l) => s + (parseFloat(l.ai_precio_sugerido) || 0), 0)
      };
    });

    // Avg days per stage from history
    const avgDaysInStage = await prisma.$queryRaw`
      SELECT
        h."stageId",
        s.nombre,
        ROUND(AVG(COALESCE(h."durationMin", EXTRACT(EPOCH FROM (NOW() - h."enteredAt"))/60)) / 1440, 1) AS "avgDays"
      FROM lead_stage_history h
      JOIN stages s ON s.id = h."stageId"
      WHERE s."funnelId" = ${funnelId}
      GROUP BY h."stageId", s.nombre
    `;

    res.json({
      success: true,
      data: {
        totalLeads,
        byStage,
        totalValue,
        avgScore,
        conversionRate,
        avgDaysInStage
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
