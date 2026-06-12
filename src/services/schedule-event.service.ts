import { supabase } from '../lib/supabase';
import type { ScheduleEvent, ScheduleEventStatus, ScheduleEventType } from '../types/database';

export type ScheduleEventFormValues = {
  title: string;
  event_date: string;
  start_time: string;
  end_time: string;
  location: string;
  note: string;
  event_type: ScheduleEventType;
  status: ScheduleEventStatus;
};

export type ScheduleEventPayload = Omit<ScheduleEventFormValues, 'status'> & {
  status?: ScheduleEventStatus;
};

export const scheduleEventTypeLabels: Record<ScheduleEventType, string> = {
  meeting: '会议',
  training: '培训',
  shooting: '拍摄',
  live: '直播',
  visit: '拜访',
  other: '其他',
};

export const scheduleEventStatusLabels: Record<ScheduleEventStatus, string> = {
  active: '进行中',
  cancelled: '已取消',
};

export const scheduleEventService = {
  async getMyScheduleEvents(month: string) {
    const userId = await getCurrentUserId();
    const { startDate, endDate } = getMonthRange(month);
    const { data, error } = await supabase
      .from('schedule_events')
      .select('*')
      .eq('profile_id', userId)
      .gte('event_date', startDate)
      .lte('event_date', endDate)
      .order('event_date', { ascending: true })
      .order('start_time', { ascending: true, nullsFirst: false });

    if (error) {
      throw error;
    }

    return (data ?? []) as ScheduleEvent[];
  },

  async createScheduleEvent(values: ScheduleEventPayload) {
    const userId = await getCurrentUserId();
    const { error } = await supabase.from('schedule_events').insert({
      profile_id: userId,
      ...normalizeScheduleEventPayload(values),
    });

    if (error) {
      throw error;
    }
  },

  async updateScheduleEvent(id: string, values: ScheduleEventPayload) {
    const { error } = await supabase
      .from('schedule_events')
      .update(normalizeScheduleEventPayload(values))
      .eq('id', id);

    if (error) {
      throw error;
    }
  },

  async deleteScheduleEvent(id: string) {
    const { error } = await supabase.from('schedule_events').delete().eq('id', id);

    if (error) {
      throw error;
    }
  },
};

export function getMonthRange(month: string) {
  const [yearText, monthText] = month.split('-');
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 0);

  return {
    startDate: toDateKey(start),
    endDate: toDateKey(end),
  };
}

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  const userId = data.user?.id;

  if (!userId) {
    throw new Error('请先登录后再管理行程。');
  }

  return userId;
}

function normalizeScheduleEventPayload(values: ScheduleEventPayload) {
  return {
    title: values.title.trim(),
    event_date: values.event_date,
    start_time: values.start_time || null,
    end_time: values.end_time || null,
    location: values.location.trim() || null,
    note: values.note.trim() || null,
    event_type: values.event_type,
    status: values.status ?? 'active',
  };
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}
