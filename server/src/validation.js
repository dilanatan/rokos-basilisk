import { z } from 'zod';
import { HttpError } from './auth.js';

const text = (max = 200) => z.string().trim().min(1, 'Boş bırakılamaz').max(max);
export const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tarih YYYY-MM-DD olmalı').refine((value) => {
  const parsed = new Date(value + 'T12:00:00Z');
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}, 'Geçersiz tarih');
const person = z.union([text(), z.number().int().positive()]);
const status = z.enum(['todo', 'in_progress', 'review', 'done']);
export const taskSchema = z.object({
  title: text(), description: z.string().max(10000).optional(),
  type: z.enum(['daily', 'backup', 'project', 'incident']).optional(),
  category: text(100).optional(), priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  status: status.optional(), assignee: person.optional(), backup_assignee: z.union([person, z.literal(''), z.null()]).optional(),
  due_date: date.optional(), recurrence: z.enum(['none', 'daily', 'weekly']).optional(),
}).strict();
export const taskPatchSchema = taskSchema.partial();
const bool = z.union([z.boolean(), z.enum(['true', 'false'])]).transform(v => v === true || v === 'true');
export const taskFilterSchema = z.object({
  status: z.enum(['todo', 'in_progress', 'review', 'done', 'open']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  type: z.enum(['daily', 'backup', 'project', 'incident']).optional(),
  category: text(100).optional(), assignee: person.optional(), mine: bool.optional(), overdue: bool.optional(),
  due: z.literal('today').optional(), search: text().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});
export const eventSchema = z.object({
  title: text(), type: z.enum(['conference', 'training', 'ctf', 'webinar', 'meetup', 'exam']),
  participation: z.enum(['individual', 'corporate']).optional(), start_date: date,
  end_date: z.union([date, z.literal('')]).optional(), location: z.string().trim().max(500).optional(),
  description: z.string().max(10000).optional(), status: z.enum(['scheduled', 'cancelled']).optional(),
}).strict();
export const skillSchema = z.object({ name: text(100), category: z.string().trim().max(100).optional(), level: z.coerce.number().int().min(1).max(5), user: person.optional() }).strict();
export const certSchema = z.object({ name: text(), issuer: z.string().trim().max(200).optional(), obtained_at: date.optional(), expires_at: z.union([date, z.literal(''), z.null()]).optional(), user: person.optional() }).strict();
export const announcementSchema = z.object({ title: text(), body: text(10000), audience: text(100).optional() }).strict();
export const roleSchema = z.object({ role: z.enum(['employee', 'manager', 'director']).optional(), manager_id: z.number().int().positive().nullable().optional() }).strict();
export const commentSchema = text(5000);
export const chatSchema = z.object({
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: text(4000) }).strict()).min(1).max(12),
  requestId: z.string().uuid(), page: z.string().max(200).optional(),
}).strict();
export function parse(schema, input) {
  const result = schema.safeParse(input);
  if (!result.success) throw new HttpError(400, result.error.issues.map(i => [i.path.join('.'), i.message].filter(Boolean).join(': ')).join('; '));
  return result.data;
}
export function checkDates(start, end) {
  if (end && end < start) throw new HttpError(400, 'Bitiş tarihi başlangıçtan önce olamaz');
}
