import 'dotenv/config';
import express from 'express';
import OpenAI from 'openai';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 3000);
const model = process.env.OPENAI_MODEL || 'gpt-5.6';
const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

app.use(express.json({ limit: '2mb' }));
app.use(express.static(__dirname, { extensions: ['html'] }));

const catalogPath = path.join(__dirname, 'catalog.generated.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const flatCatalog = [
  ...catalog.milkyWay.map(row => ({
    id: row.ID,
    name: row.Name,
    category: row.Category,
    subtype: row.Subtype,
    location: `${row['Sky direction / constellation'] || ''}; ${row['Location in Milky Way'] || ''}`,
    description: row['Location / use note'],
    source: row['Source URL']
  })),
  ...catalog.nearbyGalaxies.map(row => ({
    id: row['Galaxy ID'],
    name: row.Galaxy,
    category: 'Galaxy',
    subtype: row['Morphological type'],
    location: `${row.Constellation || ''}; ${row['Group / cluster'] || ''}`,
    description: row['Why selected'],
    source: row['NED URL']
  })),
  ...catalog.internalFeatures.map(row => ({
    id: row['Feature ID'],
    name: row['Feature / atlas name'],
    category: row.Category,
    subtype: row['Naming status'],
    location: `${row['Host galaxy'] || ''}; ${row['Location inside host'] || ''}`,
    description: row.Description,
    confidence: row.Confidence,
    source: row['Source URL']
  })),
  ...catalog.groupsAndClusters.map(row => ({
    id: row.ID,
    name: row.Name,
    category: row.Class,
    subtype: row.Class,
    location: row['Sky region'],
    description: `${row['Key members'] || ''}. ${row['Relation to Milky Way'] || ''}`,
    source: row['Source URL']
  }))
];


const normalizeGalaxyKey = value => String(value || '').toLowerCase().replace(/[’]/g, "'").replace(/\([^)]*\)/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
const galaxyCatalogLookup = new Map();
for (const galaxy of catalog.nearbyGalaxies) {
  const aliases = [galaxy['Galaxy ID'], galaxy.Galaxy, galaxy['Alternate designation'], ...String(galaxy['Alternate designation'] || '').split('/')];
  for (const alias of aliases.filter(Boolean)) galaxyCatalogLookup.set(normalizeGalaxyKey(alias), galaxy);
}
function featuresForGalaxy(identifier) {
  const galaxy = galaxyCatalogLookup.get(normalizeGalaxyKey(identifier));
  if (!galaxy) return null;
  const prefix = galaxy['Galaxy ID'];
  return { galaxy, features: catalog.internalFeatures.filter(row => String(row['Feature ID']).startsWith(`${prefix}-`)) };
}

app.get('/api/catalog/galaxy/:identifier', (req, res) => {
  const result = featuresForGalaxy(req.params.identifier);
  if (!result) return res.status(404).json({ error: 'Galaxy catalog entry not found.' });
  res.json(result);
});

const STOPWORDS = new Set(['what','where','which','when','will','with','from','into','that','this','have','about','show','take','there','known','does','make','could','would','their','ours','universe']);
function tokens(text) {
  return String(text || '').toLowerCase().match(/[a-z0-9*+-]{3,}/g)?.filter(t => !STOPWORDS.has(t)) || [];
}
function retrieveCatalog(question, limit = 14) {
  const queryTokens = tokens(question);
  return flatCatalog.map(row => {
    const haystack = `${row.name} ${row.category} ${row.subtype} ${row.location} ${row.description}`.toLowerCase();
    let score = 0;
    for (const token of queryTokens) {
      if (String(row.name).toLowerCase() === token) score += 15;
      else if (String(row.name).toLowerCase().includes(token)) score += 7;
      if (haystack.includes(token)) score += 2;
    }
    if (/star.*born|stellar nursery|star formation/i.test(question) && /nebula|molecular|h ii/i.test(haystack)) score += 5;
    if (/life|habitable|ocean/i.test(question) && /planet|moon|ocean|water|exoplanet/i.test(haystack)) score += 4;
    if (/black hole/i.test(question) && /black hole/i.test(haystack)) score += 7;
    if (/galaxy.*collid|merge/i.test(question) && /andromeda|interact|merger/i.test(haystack)) score += 7;
    return { row, score };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, limit).map(x => x.row);
}

const actionSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['action','objectId','objectIds','compareIds','learningLevel','lesson','teacher'],
  properties: {
    action: { type: 'string', enum: ['focus_object','guided_tour','compare_objects','misconception_correction','teacher_lesson'] },
    objectId: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    objectIds: { type: 'array', items: { type: 'string' }, maxItems: 8 },
    compareIds: { type: 'array', items: { type: 'string' }, maxItems: 3 },
    learningLevel: { type: 'string', enum: ['elementary','middle','highschool','ap','college','advanced'] },
    lesson: {
      type: 'object', additionalProperties: false,
      required: ['title','summary','whySelected','teachingApproach','uncertainty','quiz','next'],
      properties: {
        title: { type: 'string' },
        summary: { type: 'string' },
        whySelected: { type: 'string' },
        teachingApproach: { type: 'string' },
        uncertainty: { type: 'string' },
        quiz: {
          anyOf: [
            { type: 'null' },
            {
              type: 'object', additionalProperties: false,
              required: ['question','options','answer','explanation','easierQuestion'],
              properties: {
                question: { type: 'string' },
                options: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 4 },
                answer: { type: 'integer', minimum: 0, maximum: 3 },
                explanation: { type: 'string' },
                easierQuestion: { type: 'string' }
              }
            }
          ]
        },
        next: { type: 'array', items: { type: 'string' }, maxItems: 4 }
      }
    },
    teacher: {
      anyOf: [
        { type: 'null' },
        {
          type: 'object', additionalProperties: false,
          required: ['duration','objectIds','objectives','discussion','exitTicket'],
          properties: {
            duration: { type: 'integer', minimum: 5, maximum: 45 },
            objectIds: { type: 'array', items: { type: 'string' }, maxItems: 8 },
            objectives: { type: 'array', items: { type: 'string' }, maxItems: 5 },
            discussion: { type: 'array', items: { type: 'string' }, maxItems: 5 },
            exitTicket: { type: 'array', items: { type: 'string' }, maxItems: 4 }
          }
        }
      ]
    }
  }
};

const SYSTEM_PROMPT = `You are the structured lesson-planning engine for Cosmic Atlas, an interactive Three.js astronomy classroom.
Your output is executed by a camera and lesson UI, so return only the required JSON schema.

Educational behavior:
- Interpret the learner's intent, not merely keyword-match it.
- Choose the best visible object or an ordered multi-stop tour.
- Every plan must explain WHY the selected destination is the best place to learn the concept.
- Adapt pedagogy, vocabulary, examples, and questions to the supplied learning level; do not merely shorten text.
- Correct misconceptions respectfully by showing visual evidence.
- Distinguish promising conditions from confirmed evidence, especially for extraterrestrial life.
- Never fabricate certainty. Explain measurement uncertainty and changing scientific estimates.
- For questions like “largest star,” explain that rankings depend on definitions and measurements.
- A process that unfolds over time should usually become a guided_tour.
- Comparisons should use compare_objects.
- Teacher mode must return teacher_lesson with objectives, an ordered sequence, discussion prompts, and an exit ticket.

Navigation constraints:
- objectId, objectIds, compareIds, and teacher.objectIds MUST use IDs from AVAILABLE RENDERED OBJECTS.
- Prefer 1 destination for a focused concept and 4–7 stops for a process.
- Keep summaries concise enough for an on-screen panel, but educationally complete.
- quiz.answer is a zero-based index into quiz.options.
- teacher must be null outside teacher mode. In teacher mode, quiz may be null.
- Do not include chain-of-thought or private reasoning.`;

function sanitizePlan(plan, availableObjects, learningLevel) {
  const available = new Set(availableObjects.map(o => o.id));
  const byName = new Map(availableObjects.map(o => [String(o.name).toLowerCase(), o.id]));
  const mapId = id => {
    if (!id) return null;
    if (available.has(id)) return id;
    const exact = byName.get(String(id).toLowerCase());
    if (exact) return exact;
    const found = availableObjects.find(o => String(o.name).toLowerCase().includes(String(id).toLowerCase()));
    return found?.id || null;
  };
  plan.learningLevel = learningLevel;
  plan.objectId = mapId(plan.objectId);
  plan.objectIds = (plan.objectIds || []).map(mapId).filter(Boolean);
  plan.compareIds = (plan.compareIds || []).map(mapId).filter(Boolean);
  if (plan.teacher) plan.teacher.objectIds = (plan.teacher.objectIds || []).map(mapId).filter(Boolean);
  if (plan.action === 'guided_tour' && !plan.objectIds.length) plan.objectIds = ['earth'].filter(id => available.has(id));
  if (['focus_object','misconception_correction'].includes(plan.action) && !plan.objectId) plan.objectId = available.has('earth') ? 'earth' : availableObjects[0]?.id || null;
  return plan;
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, model, catalogRows: catalog.metadata.counts.total, galaxies: catalog.metadata.counts.nearbyGalaxies, internalFeatures: catalog.metadata.counts.internalFeatures, apiConfigured: Boolean(client) });
});

app.post('/api/ask', async (req, res) => {
  try {
    if (!client) return res.status(503).json({ error: 'OPENAI_API_KEY is not configured. The frontend will use local demo mode.' });
    const { question, mode = 'student', learningLevel = 'highschool', currentObject = null, availableObjects = [], duration = 15, teacherLevel } = req.body || {};
    if (!question || typeof question !== 'string') return res.status(400).json({ error: 'A question is required.' });
    if (!Array.isArray(availableObjects) || !availableObjects.length) return res.status(400).json({ error: 'availableObjects is required.' });

    const evidence = retrieveCatalog(question);
    const input = {
      mode,
      question: question.slice(0, 800),
      learningLevel: teacherLevel || learningLevel,
      currentObject,
      requestedDuration: duration,
      availableRenderedObjects: availableObjects.map(({ id, name, type, subtype, scale, constellation, description }) => ({ id, name, type, subtype, scale, constellation, description })).slice(0, 320),
      retrievedCatalogEvidence: evidence,
      catalogCoverage: catalog.metadata.counts
    };

    const response = await client.responses.create({
      model,
      reasoning: { effort: 'medium' },
      instructions: SYSTEM_PROMPT,
      input: JSON.stringify(input),
      text: {
        verbosity: 'medium',
        format: {
          type: 'json_schema',
          name: 'cosmic_atlas_lesson_plan',
          strict: true,
          schema: actionSchema
        }
      }
    });

    if (!response.output_text) throw new Error('The model returned no structured output.');
    const plan = sanitizePlan(JSON.parse(response.output_text), availableObjects, teacherLevel || learningLevel);
    res.json(plan);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'The lesson planner failed.', detail: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});

app.use((_req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(port, () => console.log(`Cosmic Atlas AI running at http://localhost:${port}`));
