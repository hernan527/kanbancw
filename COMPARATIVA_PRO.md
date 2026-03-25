**Comparativa Pro**

Nota operativa: en `codigo_frontend` no está el source del frontend, sino el build compilado en `codigo_frontend/usr/share/nginx/html/assets/index-BJXxQsb6.js`. Los puntos de inserción del frontend están inferidos desde las rutas activas del bundle.

<table>
  <thead>
    <tr>
      <th>Categoría</th>
      <th>Funcionalidad</th>
      <th>Estado real del repo</th>
      <th>Brecha</th>
      <th>Punto de inserción recomendado</th>
      <th>Plan de implementación</th>
      <th>Prioridad</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td rowspan="3"><strong>Visualización</strong></td>
      <td>Board Kanban por funnel</td>
      <td>Parcial/Operativo. Hay funnels, stages, cards, stats y movimiento entre etapas en backend; el board principal vive en la ruta <code>/</code>.</td>
      <td>Falta consolidar vistas alternativas y observabilidad en vivo.</td>
      <td>Frontend: ruta <code>/</code> (componente principal del board, inferido como <code>pve</code> en el bundle). Backend: <code>routes/funnels.js</code>, <code>routes/kanban.js</code>.</td>
      <td>Normalizar contrato de datos del board, extraer store por funnel, sumar loaders por vista y unificar métricas del tablero.</td>
      <td>-</td>
    </tr>
    <tr>
      <td>Vista Lista / Tabla con filtros</td>
      <td>Faltante en UI. El backend ya expone suficiente base para construirla.</td>
      <td>No existe representación tabular filtrable del mismo dataset del board.</td>
      <td>Frontend: misma ruta <code>/</code> con toggle de vista compartiendo store del board. Backend: reutilizar <code>GET /api/funnels</code> y <code>/api/kanban</code>.</td>
      <td>Agregar view switcher <code>board|list</code>, columnas configurables, filtros por funnel/stage/leadStatus/assignee/inbox y paginación virtual.</td>
      <td>Medio</td>
    </tr>
    <tr>
      <td>Vista Timeline (Gantt follow-up)</td>
      <td>Faltante. No hay timeline nativo para leads.</td>
      <td>Falta modelo temporal derivado de eventos, tareas y permanencia por etapa.</td>
      <td>Frontend: nueva vista hermana del board en <code>/</code>. Backend: ampliar <code>conversation-details</code> y agregar endpoint de timeline por card/conversación.</td>
      <td>Crear snapshot temporal por card, exponer traza de cambios de etapa, combinar tareas/scheduled messages y renderizar timeline/Gantt con zoom día-semana-mes.</td>
      <td><strong>ALTO</strong></td>
    </tr>

    <tr>
      <td rowspan="3"><strong>Cards</strong></td>
      <td>Custom fields (texto, fecha, select)</td>
      <td>Parcial. Ya existen modelos <code>CustomField</code> y <code>CustomFieldValue</code> y endpoints CRUD en <code>routes/customFields.js</code>.</td>
      <td>La deuda principal es de UX y edición integrada en card/modal.</td>
      <td>Frontend: vista de card expandida y panel lateral del board. Backend: <code>prisma/schema.prisma</code> + <code>routes/customFields.js</code>.</td>
      <td>Incrustar renderer por tipo de campo, validaciones por funnel, reorder de campos y edición inline con autosave.</td>
      <td>Medio</td>
    </tr>
    <tr>
      <td>Sub-tareas (checklist interno)</td>
      <td>Parcial. Ya existen <code>Task</code> y endpoints en <code>routes/conversation-details.js</code>.</td>
      <td>Falta presentarlo como checklist del card y no solo como detalle técnico.</td>
      <td>Frontend: modal/vista expandida de card. Backend: <code>/api/conversations/:id/tasks</code>.</td>
      <td>Transformar tareas en checklist con quick add, drag de prioridad, due date y contador visible por card.</td>
      <td>Medio</td>
    </tr>
    <tr>
      <td>Notas internas (historial)</td>
      <td>Parcial. Hay chat interno global, pero no notas internas por card/conversación.</td>
      <td>Falta un stream de notas contextual y auditado dentro del CRM.</td>
      <td>Frontend: modal/vista expandida. Backend: nuevo modelo <code>CardNote</code> o <code>ConversationNote</code>, más endpoint dedicado.</td>
      <td>Agregar notas cronológicas con autor, @menciones, archivos y separación clara respecto a mensajes del contacto.</td>
      <td>Medio</td>
    </tr>

    <tr>
      <td rowspan="3"><strong>Automaciones</strong></td>
      <td>Auto-mensaje al mover stage</td>
      <td>Parcial/Existente en backend. Ya hay <code>automations.autoMessage</code> en etapas y envío real en <code>routes/kanban.js</code>.</td>
      <td>Falta UI completa de configuración, pruebas y versionado.</td>
      <td>Frontend: administración de stages/funnels. Backend: <code>Stage.automations</code> + <code>chatwoot.sendMessage</code>.</td>
      <td>Exponer builder visual de automations por etapa, preview de mensaje, test mode y validación de placeholders.</td>
      <td>Medio</td>
    </tr>
    <tr>
      <td>SLA / Alerta por días en stage</td>
      <td>Faltante.</td>
      <td>No existe persistencia de permanencia ni job de alertas por stage.</td>
      <td>Frontend: chips de riesgo y filtros por atraso en board/lista. Backend: nuevo histórico <code>CardStageEvent</code> + scheduler.</td>
      <td>Persistir entrada/salida por etapa, calcular aging, disparar alertas por umbrales y exponer estados <code>ok|warning|breached</code>.</td>
      <td>Medio</td>
    </tr>
    <tr>
      <td>Triggers condicionales (If/Then)</td>
      <td>Parcial. El motor de flows ya soporta condiciones, switch y <code>httpRequest</code>, pero no hay motor declarativo acoplado al Kanban.</td>
      <td>Falta traducir eventos del board a reglas de negocio reutilizables.</td>
      <td>Frontend: builder de reglas en funnel/stage. Backend: reusar <code>flowEngine</code> o crear <code>kanbanAutomationService</code>.</td>
      <td>Crear reglas sobre eventos <code>card.created/moved/updated</code>, condiciones por stage/leadStatus/custom field y acciones sobre mensaje, webhook, tarea y score.</td>
      <td>Medio</td>
    </tr>

    <tr>
      <td rowspan="3"><strong>Reportes</strong></td>
      <td>Stats básicas (Won/Lost)</td>
      <td>Existente. <code>/api/kanban/stats</code> ya calcula <code>won/lost/open</code>, conversión y motivos.</td>
      <td>Falta mejor visualización y refresh en vivo.</td>
      <td>Frontend: hoy parece entrar por <code>/projects-reports</code>; conviene separarlo como dashboard comercial. Backend: <code>routes/kanban.js</code>.</td>
      <td>Reaprovechar endpoint actual, sumar cache liviano y empaquetar KPIs en widgets consumibles por dashboard.</td>
      <td>-</td>
    </tr>
    <tr>
      <td>Velocidad por stage (Promedios)</td>
      <td>Faltante.</td>
      <td>No hay tracking histórico de permanencia por etapa.</td>
      <td>Backend: nuevo <code>CardStageEvent</code>/<code>CardStageSnapshot</code>. Frontend: dashboard y timeline.</td>
      <td>Guardar eventos de entrada/salida, derivar tiempo promedio, percentiles y throughput por funnel/stage.</td>
      <td>Medio</td>
    </tr>
    <tr>
      <td>Dashboard Live (Charts animados)</td>
      <td>Faltante como dashboard comercial dedicado. Existe la ruta <code>/projects-reports</code> y stats de proyectos, pero no live dashboard de Kanban.</td>
      <td>Falta vista analítica en tiempo real para ventas/leads.</td>
      <td>Frontend: mejor punto de inserción inicial es <code>/projects-reports</code> para reconvertirlo en centro analítico o crear <code>/kanban-reports</code> derivado. Backend: ampliar <code>/api/kanban/stats</code> y sumar websocket.</td>
      <td>Crear página de dashboard con KPIs, embudos, aging, conversión y series temporales; actualizar por Socket.IO y fallback polling.</td>
      <td><strong>ALTO</strong></td>
    </tr>

    <tr>
      <td rowspan="2"><strong>Colaboración</strong></td>
      <td>Chat interno y @Menciones</td>
      <td>Parcial. Hay chat interno operativo con sockets y archivos en <code>routes/internal-chat.js</code>, pero no @menciones ni contexto de card.</td>
      <td>Falta integración contextual y parsing de menciones.</td>
      <td>Frontend: ruta <code>/chats</code> y modal de card. Backend: ampliar <code>InternalChatMessage</code> y eventos socket.</td>
      <td>Agregar parser de menciones, notificaciones, deep links a card/conversation y sidebar contextual “equipo del lead”.</td>
      <td>Medio</td>
    </tr>
    <tr>
      <td>Actividad en tiempo real (Live)</td>
      <td>Parcial. Ya existe Socket.IO en backend.</td>
      <td>Falta feed unificado de actividad del Kanban y del CRM.</td>
      <td>Frontend: board, lista, modal y dashboard. Backend: emitir eventos <code>card.*</code>, <code>task.*</code>, <code>note.*</code>, <code>score.*</code>.</td>
      <td>Implementar event bus de UI con notificaciones no intrusivas, feed de actividad y sync optimista de cards.</td>
      <td>Medio</td>
    </tr>

    <tr>
      <td rowspan="3"><strong>IA</strong></td>
      <td>AI Credentials (OpenAI/Groq)</td>
      <td>Existente en backend. Hay modelo <code>AICredentials</code>, ruta <code>/ai-credentials</code> y servicio <code>AIService</code>.</td>
      <td>La brecha es de integración funcional y UI visible.</td>
      <td>Frontend: probablemente ruta <code>/permissions</code> o nueva sección de setup/admin. Backend: <code>routes/ai-credentials.js</code>, <code>services/aiService.js</code>.</td>
      <td>Exponer panel de credenciales, test de conexión y selección de provider/model por account/funnel.</td>
      <td>Medio</td>
    </tr>
    <tr>
      <td>Resumen de conversa / Auto-fill</td>
      <td>Faltante como feature CRM. Hay base reusable: mensajes de conversación, Knowledge Base y AIService.</td>
      <td>Falta servicio de summarization y escritura de salida en card/custom fields.</td>
      <td>Frontend: vista expandida de card y <code>/conversation/:id</code>. Backend: <code>conversation-details</code> + nuevo servicio <code>conversationInsightsService</code>.</td>
      <td>Resumir últimas N interacciones, detectar intención, próximo paso y rellenar campos sugeridos con confirmación humana.</td>
      <td>Medio</td>
    </tr>
    <tr>
      <td>Lead Scoring con IA</td>
      <td>Faltante, pero con base fuerte: <code>AICredentials</code>, <code>AIService</code>, <code>KnowledgeBase</code>, datos de card y conversación.</td>
      <td>Falta persistencia de score, configuración por funnel y job de recálculo.</td>
      <td>Backend: nuevo eje en <code>codigo_backend/app</code> sobre <code>services/aiService.js</code>, <code>routes/kanban.js</code>, <code>routes/conversation-details.js</code> y Prisma.</td>
      <td>Agregar <code>LeadScoreConfig</code> y <code>LeadScoreRun</code>; extender <code>Card</code> con <code>leadScore</code>, <code>leadTemperature</code>, <code>lastScoredAt</code>, <code>scoreBreakdown</code>; disparar scoring por webhook, stage change y cron.</td>
      <td><strong>ALTO</strong></td>
    </tr>

    <tr>
      <td rowspan="3"><strong>UX / UI</strong></td>
      <td>Drag &amp; Drop entre columnas</td>
      <td>Básico/Operativo.</td>
      <td>Faltan affordances, accesibilidad y manejo fino de estados.</td>
      <td>Frontend: board principal en <code>/</code>. Backend: persistencia de orden en <code>kanban.js</code>.</td>
      <td>Mejorar ghost states, keyboard DnD, scroll automático y batch updates.</td>
      <td>-</td>
    </tr>
    <tr>
      <td>Quick actions (Hover)</td>
      <td>Faltante.</td>
      <td>No hay acciones rápidas visibles en card list/board.</td>
      <td>Frontend: card component del board y vista lista.</td>
      <td>Agregar hover actions para abrir modal, marcar won/lost, crear tarea, asignar score y mover a siguiente etapa.</td>
      <td>Medio</td>
    </tr>
    <tr>
      <td>Vista expandida (Modal CRM)</td>
      <td>Faltante como experiencia integrada. Sí existe una ruta dedicada <code>/conversation/:id</code>, lo que indica base ideal para reaprovechar contenido.</td>
      <td>Falta superponer la experiencia de detalle sin salir del board.</td>
      <td><strong>Frontend recomendado:</strong> reutilizar la lógica actual de <code>/conversation/:id</code> como contenido de un modal/side-panel invocado desde la ruta <code>/</code>. El componente de detalle ya existe en el bundle como la entrada de esa ruta.</td>
      <td>Crear un contenedor <code>CardCRMModal</code> que monte el detalle actual de conversación + custom fields + checklist + notas + timeline + scoring, con apertura desde board/lista.</td>
      <td><strong>ALTO</strong></td>
    </tr>

    <tr>
      <td rowspan="2"><strong>Integraciones</strong></td>
      <td>Webhook outbound / API REST</td>
      <td>Parcial/Existente. Ya hay <code>WebhookConfig</code>, dispatcher y UI compilada en <code>/webhook-configs</code>.</td>
      <td>Faltan mayor cobertura de eventos, pruebas de seguridad y documentación pública de API.</td>
      <td>Frontend: ruta <code>/webhook-configs</code>. Backend: <code>routes/webhook-configs.js</code>, <code>services/webhookDispatcher.js</code>, <code>routes/public-api.js</code>.</td>
      <td>Completar eventos, agregar replay, dead-letter logging, firma obligatoria opcional y documentación OpenAPI por recurso CRM.</td>
      <td>Medio</td>
    </tr>
    <tr>
      <td>Importar CSV / Leads masivo</td>
      <td>Faltante.</td>
      <td>No existe pipeline de ingestión batch de leads/cards.</td>
      <td>Frontend: board/lista y admin de funnels. Backend: nuevo módulo <code>imports</code> sobre Prisma + validación CSV.</td>
      <td>Subir CSV, mapear columnas a custom fields, crear/matchear contactos, generar cards por funnel/stage y reportar errores por fila.</td>
      <td>Medio</td>
    </tr>
  </tbody>
</table>

## Puntos de inserción inmediatos

### 1. Vista expandida de card

- Mejor punto: reutilizar la experiencia existente de `codigo_frontend/usr/share/nginx/html/assets/index-BJXxQsb6.js` asociada a la ruta `/conversation/:id`.
- Implementación recomendada: convertir ese contenido en componente compartido y montarlo como modal o side-panel desde la ruta `/`.
- Razón: ya existe soporte backend para detalles de conversación, tareas, adjuntos y mensajes agendados en `codigo_backend/app/dist/routes/conversation-details.js`.

### 2. Dashboard live

- Mejor punto inicial: la ruta `/projects-reports`, ya presente en el router compilado.
- Recomendación: reconvertirla a dashboard transversal de Kanban o duplicar el patrón para una nueva ruta `/kanban-reports`.
- Base backend disponible: `GET /api/kanban/stats` en `codigo_backend/app/dist/routes/kanban.js`; faltan series temporales, stage velocity y canal en vivo por Socket.IO.

### 3. Lead scoring con IA

- Base ya disponible:
  - `AICredentials` en Prisma.
  - `routes/ai-credentials.js`.
  - `services/aiService.js`.
  - Datos de conversación vía `chatwoot.js`.
  - Contexto adicional vía `KnowledgeBase`.
- Estructura propuesta:
  - Extender `Card` con `leadScore`, `leadTemperature`, `lastScoredAt`, `scoreBreakdown`, `aiSummary`.
  - Crear `LeadScoreConfig` por `accountId/funnelId`.
  - Crear `LeadScoreRun` para auditoría y debugging.
  - Agregar `services/leadScoringService`.
  - Exponer `routes/lead-scoring`.
  - Disparadores: cambio de stage, actualización de custom fields, nuevas conversaciones, webhook `message_created` y recálculo manual.

## Orden de implementación recomendado

1. Vista expandida de card.
2. Custom fields + checklist + notas internas dentro de esa vista.
3. Dashboard live sobre `kanban/stats` + nuevos endpoints de series.
4. Lead scoring con IA.
5. SLA por stage y triggers condicionales.
6. CSV import y hardening de integraciones.
