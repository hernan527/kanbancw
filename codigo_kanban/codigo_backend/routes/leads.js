const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const aiService = require('../services/iaService');

const prisma = new PrismaClient();

// POST /api/leads
router.post('/', async (req, res) => {
  try {
    const { funnelId, stageId, ...leadData } = req.body;

    // Resolve first stage of funnel if no stageId given
    let resolvedStageId = stageId ? parseInt(stageId) : null;
    let resolvedFunnelId = funnelId ? parseInt(funnelId) : null;

    if (resolvedFunnelId && !resolvedStageId) {
      const firstStage = await prisma.stage.findFirst({
        where: { funnelId: resolvedFunnelId },
        orderBy: { orden: 'asc' }
      });
      if (firstStage) resolvedStageId = firstStage.id;
    }

    // AI analysis
    const aiResult = await aiService.analizarLead(leadData);

    const lead = await prisma.$transaction(async (tx) => {
      const newLead = await tx.lead.create({
        data: {
          ...leadData,
          edad: parseInt(leadData.edad),
          hijos: parseInt(leadData.hijos) || 0,
          ingresos_mensuales: parseFloat(leadData.ingresos_mensuales),
          funnelId: resolvedFunnelId,
          stageId: resolvedStageId,
          ai_score: aiResult.score,
          ai_analysis: aiResult.analisis,
          ai_precio_sugerido: aiResult.precio_sugerido
        },
        include: { stage: true, funnel: true }
      });

      // Create initial history entry
      if (resolvedStageId) {
        const stage = await tx.stage.findUnique({ where: { id: resolvedStageId } });
        await tx.leadStageHistory.create({
          data: {
            leadId: newLead.id,
            stageId: resolvedStageId,
            stageName: stage?.nombre || 'Desconocido'
          }
        });
      }

      return newLead;
    });

    res.status(201).json({
      success: true,
      data: lead,
      ai_score: aiResult.score,
      mensaje: 'Lead creado y analizado con IA'
    });
  } catch (error) {
    console.error('Error al crear lead:', error);
    res.status(500).json({ success: false, error: 'Error al crear lead', detalles: error.message });
  }
});

// GET /api/leads
router.get('/', async (req, res) => {
  try {
    const { funnelId } = req.query;
    const where = funnelId ? { funnelId: parseInt(funnelId) } : {};

    const leads = await prisma.lead.findMany({
      where,
      include: {
        stage: true,
        funnel: true,
        history: { orderBy: { enteredAt: 'desc' }, take: 10 }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: leads, total: leads.length });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener leads' });
  }
});

// GET /api/leads/:id
router.get('/:id', async (req, res) => {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        stage: true,
        funnel: true,
        history: {
          include: { stage: true },
          orderBy: { enteredAt: 'desc' }
        }
      }
    });

    if (!lead) return res.status(404).json({ success: false, error: 'Lead no encontrado' });
    res.json({ success: true, data: lead });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener lead' });
  }
});

// PUT /api/leads/:id
router.put('/:id', async (req, res) => {
  try {
    const { funnelId, stageId, history, stage, funnel, ...data } = req.body;
    const lead = await prisma.lead.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...data,
        edad: data.edad ? parseInt(data.edad) : undefined,
        hijos: data.hijos != null ? parseInt(data.hijos) : undefined,
        ingresos_mensuales: data.ingresos_mensuales ? parseFloat(data.ingresos_mensuales) : undefined
      },
      include: { stage: true, funnel: true }
    });
    res.json({ success: true, data: lead });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al actualizar lead', detalles: error.message });
  }
});

// DELETE /api/leads/:id
router.delete('/:id', async (req, res) => {
  try {
    await prisma.lead.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true, mensaje: 'Lead eliminado' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al eliminar lead' });
  }
});

// PATCH /api/leads/:id/stage — move lead between stages with history tracking
router.patch('/:id/stage', async (req, res) => {
  try {
    const leadId = parseInt(req.params.id);
    const { stageId } = req.body;

    if (!stageId) return res.status(400).json({ success: false, error: 'stageId es requerido' });

    const [lead, newStage] = await Promise.all([
      prisma.lead.findUnique({ where: { id: leadId } }),
      prisma.stage.findUnique({ where: { id: parseInt(stageId) } })
    ]);

    if (!lead) return res.status(404).json({ success: false, error: 'Lead no encontrado' });
    if (!newStage) return res.status(404).json({ success: false, error: 'Stage no encontrado' });

    const now = new Date();

    const updatedLead = await prisma.$transaction(async (tx) => {
      // Close current open history entry
      if (lead.stageId) {
        const openEntry = await tx.leadStageHistory.findFirst({
          where: { leadId, exitedAt: null }
        });
        if (openEntry) {
          const durationMin = Math.round((now - openEntry.enteredAt) / 60000);
          await tx.leadStageHistory.update({
            where: { id: openEntry.id },
            data: { exitedAt: now, durationMin }
          });
        }
      }

      // Move lead
      await tx.lead.update({
        where: { id: leadId },
        data: { stageId: newStage.id, funnelId: newStage.funnelId }
      });

      // Open new history entry
      await tx.leadStageHistory.create({
        data: { leadId, stageId: newStage.id, stageName: newStage.nombre }
      });

      return tx.lead.findUnique({
        where: { id: leadId },
        include: {
          stage: true,
          funnel: true,
          history: { orderBy: { enteredAt: 'desc' }, take: 10 }
        }
      });
    });

    res.json({ success: true, data: updatedLead });
  } catch (error) {
    console.error('Error moviendo lead:', error);
    res.status(500).json({ success: false, error: 'Error al mover lead', detalles: error.message });
  }
});

// POST /api/leads/:id/reanalizar
router.post('/:id/reanalizar', async (req, res) => {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!lead) return res.status(404).json({ success: false, error: 'Lead no encontrado' });

    const aiResult = await aiService.analizarLead(lead);
    const updated = await prisma.lead.update({
      where: { id: lead.id },
      data: {
        ai_score: aiResult.score,
        ai_analysis: aiResult.analisis,
        ai_precio_sugerido: aiResult.precio_sugerido
      },
      include: { stage: true, funnel: true }
    });

    res.json({ success: true, data: updated, mensaje: 'Re-análisis completado' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error en re-análisis' });
  }
});

module.exports = router;
