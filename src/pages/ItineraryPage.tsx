import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Edit3, Plus, Trash2 } from 'lucide-react';
import { MonthSelect } from '../components/MonthSelect';
import { SystemModal } from '../components/SystemModal';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import {
  type ScheduleEventFormValues,
  getMonthRange,
  scheduleEventService,
  scheduleEventStatusLabels,
} from '../services/schedule-event.service';
import type { ScheduleEvent } from '../types/database';

const emptyForm: ScheduleEventFormValues = {
  title: '',
  event_date: '',
  start_time: '',
  end_time: '',
  location: '',
  note: '',
  event_type: 'meeting',
  status: 'active',
};

export function ItineraryPage() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [formValues, setFormValues] = useState<ScheduleEventFormValues>(emptyForm);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const monthRange = useMemo(() => getMonthRange(month), [month]);
  const calendarCells = useMemo(
    () => getCalendarCells(monthRange.startDate, monthRange.endDate),
    [monthRange.startDate, monthRange.endDate],
  );
  const eventsByDate = useMemo(() => {
    const map = new Map<string, ScheduleEvent[]>();
    events.forEach((event) => {
      const current = map.get(event.event_date) ?? [];
      current.push(event);
      current.sort(compareScheduleEvents);
      map.set(event.event_date, current);
    });
    return map;
  }, [events]);
  const selectedDateEvents = selectedDate ? eventsByDate.get(selectedDate) ?? [] : [];

  useEffect(() => {
    void loadScheduleEvents();
  }, [month]);

  usePullToRefresh(loadScheduleEvents, [month]);

  async function loadScheduleEvents() {
    setLoading(true);
    setError('');

    try {
      const data = await scheduleEventService.getMyScheduleEvents(month);
      setEvents(data);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  function openCreate(date = '') {
    setSelectedEvent(null);
    setEditingEvent(null);
    setSelectedDate(null);
    setFormValues({ ...emptyForm, event_date: date || getDefaultCreateDate(monthRange.startDate, monthRange.endDate) });
    setShowEventForm(true);
    setError('');
    setMessage('');
  }

  function openEdit(event: ScheduleEvent) {
    setSelectedEvent(null);
    setSelectedDate(null);
    setEditingEvent(event);
    setFormValues(toFormValues(event));
    setShowEventForm(true);
    setError('');
    setMessage('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      if (!formValues.title.trim()) {
        throw new Error('标题不能为空。');
      }

      if (!formValues.event_date) {
        throw new Error('请选择日期。');
      }

      if (editingEvent) {
        await scheduleEventService.updateScheduleEvent(editingEvent.id, formValues);
        setMessage('行程已更新。');
      } else {
        await scheduleEventService.createScheduleEvent(formValues);
        setMessage('行程已新增。');
      }

      setShowEventForm(false);
      setEditingEvent(null);
      setFormValues(emptyForm);
      await loadScheduleEvents();
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(event: ScheduleEvent) {
    if (!window.confirm(`确认删除「${event.title}」？删除后无法恢复。`)) {
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      await scheduleEventService.deleteScheduleEvent(event.id);
      setSelectedEvent(null);
      setMessage('行程已删除。');
      await loadScheduleEvents();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="itinerary-page">
      <div className="view-tabs-row">
        <label className="form-field itinerary-month-field">
          <span>月份</span>
          <MonthSelect value={month} onChange={setMonth} />
        </label>

        <button className="secondary-action" type="button" onClick={() => openCreate()}>
          <Plus size={17} />
          <span>新增行程</span>
        </button>
      </div>

      {error ? <p className="form-alert">{error}</p> : null}
      {message ? <p className="form-success">{message}</p> : null}

      <div className="staff-list-panel schedule-calendar-panel">
        {loading ? (
          <div className="table-state">正在读取行程...</div>
        ) : (
          <div className="leave-calendar-grid itinerary-calendar-grid">
            {calendarCells.map((date, index) => {
              if (!date) {
                return <div className="leave-calendar-empty" key={`empty-${index}`} />;
              }

              const dayEvents = eventsByDate.get(date) ?? [];

              const visibleEvents = dayEvents.slice(0, 2);
              const hiddenCount = Math.max(dayEvents.length - visibleEvents.length, 0);

              return (
                <article className="leave-calendar-day itinerary-day" key={date} onClick={() => setSelectedDate(date)}>
                  <header>
                    <strong>{formatDayMonth(date)}</strong>
                    <span>{weekdayLabel(date)}</span>
                  </header>

                  {dayEvents.length === 0 ? (
                    <p>点击新增行程</p>
                  ) : (
                    <div className="leave-calendar-list">
                      {visibleEvents.map((event) => (
                        <div className={`schedule-event-chip event-type-${event.event_type}`} key={event.id}>
                          <span>{formatEventTime(event)}</span>
                          <strong>{event.title}</strong>
                        </div>
                      ))}
                      {hiddenCount > 0 ? <span className="itinerary-more-count">+{hiddenCount}</span> : null}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      {showEventForm ? (
        <ScheduleEventFormModal
          values={formValues}
          editingEvent={editingEvent}
          saving={saving}
          onChange={setFormValues}
          onClose={() => {
            setShowEventForm(false);
            setEditingEvent(null);
          }}
          onSubmit={handleSubmit}
        />
      ) : null}

      {selectedDate ? (
        <SystemModal
          title={`${formatDateLabel(selectedDate)} 行程`}
          ariaLabel="当天行程"
          onClose={() => setSelectedDate(null)}
          footer={
            <>
              <button className="secondary-button compact-button" type="button" onClick={() => setSelectedDate(null)}>
                关闭
              </button>
              <button className="primary-button compact-button" type="button" onClick={() => openCreate(selectedDate)}>
                <Plus size={17} />
                <span>添加行程</span>
              </button>
            </>
          }
        >
          {selectedDateEvents.length === 0 ? (
            <div className="table-state compact-state">暂无行程</div>
          ) : (
            <div className="itinerary-day-event-list">
              {selectedDateEvents.map((event) => (
                <button
                  type="button"
                  className="itinerary-day-event-row"
                  key={event.id}
                  onClick={() => {
                    setSelectedDate(null);
                    setSelectedEvent(event);
                  }}
                >
                  <span>{formatEventTime(event)}</span>
                  <strong>{event.title}</strong>
                </button>
              ))}
            </div>
          )}
        </SystemModal>
      ) : null}

      {selectedEvent ? (
        <ScheduleEventDetailModal
          event={selectedEvent}
          saving={saving}
          onClose={() => setSelectedEvent(null)}
          onEdit={() => openEdit(selectedEvent)}
          onDelete={() => handleDelete(selectedEvent)}
        />
      ) : null}
    </section>
  );
}

function ScheduleEventFormModal({
  values,
  editingEvent,
  saving,
  onChange,
  onClose,
  onSubmit,
}: {
  values: ScheduleEventFormValues;
  editingEvent: ScheduleEvent | null;
  saving: boolean;
  onChange: (values: ScheduleEventFormValues) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <SystemModal
      title={editingEvent ? editingEvent.title : '新增行程'}
      subtitle={editingEvent ? '编辑行程' : '个人行程'}
      ariaLabel={editingEvent ? '编辑行程' : '新增行程'}
      onClose={onClose}
      footer={
        <>
          <button className="secondary-button compact-button" type="button" onClick={onClose}>
            取消
          </button>
          <button className="primary-button compact-button" type="submit" form="schedule-event-form" disabled={saving}>
            <Plus size={18} />
            <span>{saving ? '保存中...' : '保存'}</span>
          </button>
        </>
      }
    >
      <form id="schedule-event-form" onSubmit={onSubmit}>
        <div className="form-grid single">
          <TextField label="标题" value={values.title} onChange={(value) => onChange({ ...values, title: value })} required />
          <TextField label="日期" type="date" value={values.event_date} onChange={(value) => onChange({ ...values, event_date: value })} required />
          <TextField label="开始时间" type="time" value={values.start_time} onChange={(value) => onChange({ ...values, start_time: value })} />
          <TextField label="结束时间" type="time" value={values.end_time} onChange={(value) => onChange({ ...values, end_time: value })} />

          <TextField label="地点" value={values.location} onChange={(value) => onChange({ ...values, location: value })} />
          <label className="form-field">
            <span>备注</span>
            <textarea value={values.note} onChange={(event) => onChange({ ...values, note: event.target.value })} />
          </label>
        </div>
      </form>
    </SystemModal>
  );
}

function ScheduleEventDetailModal({
  event,
  saving,
  onClose,
  onEdit,
  onDelete,
}: {
  event: ScheduleEvent;
  saving: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <SystemModal
      title={event.title}
      subtitle="行程详情"
      ariaLabel="行程详情"
      onClose={onClose}
      footer={
        <>
          <button className="secondary-button compact-button" type="button" onClick={onClose}>
            关闭
          </button>
          <button className="primary-button compact-button" type="button" onClick={onEdit}>
            <Edit3 size={16} />
            <span>编辑</span>
          </button>
          <button className="secondary-button compact-button danger-text-button" type="button" onClick={onDelete} disabled={saving}>
            <Trash2 size={16} />
            <span>{saving ? '删除中...' : '删除'}</span>
          </button>
        </>
      }
    >
      <div className="employee-detail-sections">
        <section className="employee-detail-section">
          <h4>基础资料</h4>
          <div className="detail-list">
            <Info label="标题" value={event.title} />
            <Info label="日期" value={event.event_date} />
            <Info label="状态" value={scheduleEventStatusLabels[event.status]} />
          </div>
        </section>

        <section className="employee-detail-section">
          <h4>时间地点</h4>
          <div className="detail-list">
            <Info label="开始时间" value={formatTime(event.start_time)} />
            <Info label="结束时间" value={formatTime(event.end_time)} />
            <Info label="地点" value={event.location} />
          </div>
        </section>

        <section className="employee-detail-section">
          <h4>备注</h4>
          <div className="detail-list">
            <Info label="备注" value={event.note} />
          </div>
        </section>
      </div>
    </SystemModal>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} />
    </label>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  );
}

function toFormValues(event: ScheduleEvent): ScheduleEventFormValues {
  return {
    title: event.title,
    event_date: event.event_date,
    start_time: formatTime(event.start_time, ''),
    end_time: formatTime(event.end_time, ''),
    location: event.location ?? '',
    note: event.note ?? '',
    event_type: event.event_type,
    status: event.status,
  };
}

function compareScheduleEvents(a: ScheduleEvent, b: ScheduleEvent) {
  return `${a.start_time ?? '99:99'}:${a.title}`.localeCompare(`${b.start_time ?? '99:99'}:${b.title}`, 'zh-CN');
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}`;
}

function getCalendarCells(startDate: string, endDate: string) {
  const date = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const dates: Array<string | null> = [];
  const mondayOffset = (date.getDay() + 6) % 7;

  for (let index = 0; index < mondayOffset; index += 1) {
    dates.push(null);
  }

  while (date <= end) {
    dates.push(toDateKey(date));
    date.setDate(date.getDate() + 1);
  }

  return dates;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function weekdayLabel(date: string) {
  return new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(new Date(`${date}T00:00:00`));
}

function formatDayMonth(date: string) {
  const value = new Date(`${date}T00:00:00`);
  return `${String(value.getDate()).padStart(2, '0')}/${value.getMonth() + 1}`;
}

function formatEventTime(event: ScheduleEvent) {
  if (!event.start_time && !event.end_time) {
    return '全天';
  }

  if (event.start_time && event.end_time) {
    return `${formatTime(event.start_time)}-${formatTime(event.end_time)}`;
  }

  return formatTime(event.start_time || event.end_time);
}

function formatTime(value: string | null | undefined, fallback = '-') {
  return value ? value.slice(0, 5) : fallback;
}

function formatDateLabel(date: string) {
  const value = new Date(`${date}T00:00:00`);
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(value);
}

function getDefaultCreateDate(startDate: string, endDate: string) {
  const today = toDateKey(new Date());
  return today >= startDate && today <= endDate ? today : startDate;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;

    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return '未知错误';
}
