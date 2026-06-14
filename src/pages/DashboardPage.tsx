import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CalendarDays, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SystemModal } from '../components/SystemModal';
import { scheduleEventService } from '../services/schedule-event.service';
import { getRecurringTodoRuleLabel, recurringTodoFrequencyLabels, todoService, type RecurringTodoPayload } from '../services/todo.service';
import type { RecurringTodoFrequency, RecurringTodoItem, ScheduleEvent, TodoItem } from '../types/database';

const emptyRecurringForm: RecurringTodoPayload = {
  title: '',
  frequency: 'weekly',
  weekly_days: [1],
  monthly_day: 6,
};

const weekdayOptions = [
  { value: 1, label: '星期一' },
  { value: 2, label: '星期二' },
  { value: 3, label: '星期三' },
  { value: 4, label: '星期四' },
  { value: 5, label: '星期五' },
  { value: 6, label: '星期六' },
  { value: 0, label: '星期日' },
];

export function DashboardPage() {
  const navigate = useNavigate();
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [completedTodoIds, setCompletedTodoIds] = useState<Set<string>>(new Set());
  const [upcomingEvents, setUpcomingEvents] = useState<ScheduleEvent[]>([]);
  const [recurringTodos, setRecurringTodos] = useState<RecurringTodoItem[]>([]);
  const [todoModalOpen, setTodoModalOpen] = useState(false);
  const [recurringModalOpen, setRecurringModalOpen] = useState(false);
  const [recurringCreateOpen, setRecurringCreateOpen] = useState(false);
  const [deletingRecurringTodo, setDeletingRecurringTodo] = useState<RecurringTodoItem | null>(null);
  const [todoTitle, setTodoTitle] = useState('');
  const [recurringForm, setRecurringForm] = useState<RecurringTodoPayload>(emptyRecurringForm);
  const [loading, setLoading] = useState(true);
  const [savingTodo, setSavingTodo] = useState(false);
  const [savingRecurring, setSavingRecurring] = useState(false);
  const [error, setError] = useState('');
  const hideTimersRef = useRef<number[]>([]);

  useEffect(() => {
    void loadDashboard();

    return () => {
      hideTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setError('');

    try {
      await todoService.syncTodayRecurringTodos();
      const [todoList, eventList, recurringList] = await Promise.all([
        todoService.getMyOpenTodos(),
        scheduleEventService.getMyUpcomingScheduleEvents(7, 5),
        todoService.getMyRecurringTodos(),
      ]);
      setTodos(todoList);
      setUpcomingEvents(eventList);
      setRecurringTodos(recurringList);
      setCompletedTodoIds(new Set());
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  async function refreshRecurringTodos() {
    const recurringList = await todoService.getMyRecurringTodos();
    setRecurringTodos(recurringList);
  }

  async function handleAddTodo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = todoTitle.trim();

    if (!title) {
      setError('请输入任务内容。');
      return;
    }

    setSavingTodo(true);
    setError('');

    try {
      const todo = await todoService.createTodo(title);
      setTodos((current) => [...current, todo]);
      setTodoTitle('');
      setTodoModalOpen(false);
    } catch (createError) {
      setError(getErrorMessage(createError));
    } finally {
      setSavingTodo(false);
    }
  }

  async function handleAddRecurringTodo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingRecurring(true);
    setError('');

    try {
      await todoService.createRecurringTodo(recurringForm);
      setRecurringForm(emptyRecurringForm);
      setRecurringCreateOpen(false);
      await refreshRecurringTodos();
      await loadDashboard();
    } catch (createError) {
      setError(getErrorMessage(createError));
    } finally {
      setSavingRecurring(false);
    }
  }

  async function handleDeleteRecurringTodo() {
    if (!deletingRecurringTodo) return;

    setSavingRecurring(true);
    setError('');

    try {
      await todoService.deleteRecurringTodo(deletingRecurringTodo.id);
      setDeletingRecurringTodo(null);
      await refreshRecurringTodos();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setSavingRecurring(false);
    }
  }

  async function handleCompleteTodo(todo: TodoItem) {
    setCompletedTodoIds((current) => new Set(current).add(todo.id));
    setError('');

    try {
      await todoService.completeTodo(todo.id);
      const timer = window.setTimeout(() => {
        setTodos((current) => current.filter((item) => item.id !== todo.id));
        setCompletedTodoIds((current) => {
          const next = new Set(current);
          next.delete(todo.id);
          return next;
        });
      }, 2000);
      hideTimersRef.current.push(timer);
    } catch (completeError) {
      setCompletedTodoIds((current) => {
        const next = new Set(current);
        next.delete(todo.id);
        return next;
      });
      setError(getErrorMessage(completeError));
    }
  }

  function openRecurringCreate() {
    setRecurringForm(emptyRecurringForm);
    setRecurringCreateOpen(true);
  }

  function updateRecurringFrequency(frequency: RecurringTodoFrequency) {
    setRecurringForm((current) => ({
      ...current,
      frequency,
      weekly_days: frequency === 'weekly' ? current.weekly_days?.length ? current.weekly_days : [1] : [],
      monthly_day: frequency === 'monthly' ? current.monthly_day ?? 6 : null,
    }));
  }

  function toggleWeeklyDay(day: number) {
    setRecurringForm((current) => {
      const days = new Set(current.weekly_days ?? []);
      if (days.has(day)) {
        days.delete(day);
      } else {
        days.add(day);
      }

      return {
        ...current,
        weekly_days: [...days].sort((first, second) => first - second),
      };
    });
  }

  return (
    <section className="home-page dashboard-workbench">
      {error ? <p className="form-alert">{error}</p> : null}

      <div className="dashboard-panel todo-panel">
        <div className="dashboard-panel-header">
          <h3>工作清单</h3>
          <div className="dashboard-header-actions">
            <button className="icon-button dashboard-add-button" type="button" onClick={() => setRecurringModalOpen(true)} aria-label="重复清单管理">
              <RefreshCw size={18} />
            </button>
            <button className="icon-button dashboard-add-button" type="button" onClick={() => setTodoModalOpen(true)} aria-label="新增工作清单">
              <Plus size={18} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="table-state compact-state">正在读取工作清单...</div>
        ) : todos.length === 0 ? (
          <div className="dashboard-empty">暂无工作清单</div>
        ) : (
          <div className="todo-list">
            {todos.map((todo) => {
              const completed = completedTodoIds.has(todo.id);
              return (
                <label className={`todo-item${completed ? ' completed' : ''}`} key={todo.id}>
                  <input type="checkbox" checked={completed} onChange={() => void handleCompleteTodo(todo)} disabled={completed} />
                  <span>{todo.title}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <div className="dashboard-panel upcoming-panel">
        <div className="dashboard-panel-header">
          <h3>近期行程</h3>
          <CalendarDays size={19} />
        </div>

        {loading ? (
          <div className="table-state compact-state">正在读取近期行程...</div>
        ) : upcomingEvents.length === 0 ? (
          <div className="dashboard-empty">暂无近期行程</div>
        ) : (
          <div className="upcoming-event-list">
            {upcomingEvents.map((event) => (
              <button className="upcoming-event-item" type="button" key={event.id} onClick={() => navigate('/itinerary')}>
                <span>{formatRelativeDate(event.event_date)}</span>
                <strong>
                  {formatEventTime(event)}
                  {event.title}
                </strong>
              </button>
            ))}
          </div>
        )}
      </div>

      {todoModalOpen ? (
        <SystemModal
          title="新增工作清单"
          ariaLabel="新增工作清单"
          wide={false}
          onClose={() => setTodoModalOpen(false)}
          footer={
            <>
              <button className="secondary-button compact-button" type="button" onClick={() => setTodoModalOpen(false)} disabled={savingTodo}>
                取消
              </button>
              <button className="primary-button compact-button" type="submit" form="dashboard-todo-form" disabled={savingTodo}>
                {savingTodo ? '添加中' : '添加'}
              </button>
            </>
          }
        >
          <form id="dashboard-todo-form" onSubmit={handleAddTodo}>
            <label className="form-field">
              <span>任务内容</span>
              <input value={todoTitle} onChange={(event) => setTodoTitle(event.target.value)} autoFocus required />
            </label>
          </form>
        </SystemModal>
      ) : null}

      {recurringModalOpen && !recurringCreateOpen && !deletingRecurringTodo ? (
        <SystemModal title="重复清单" ariaLabel="重复清单" onClose={() => setRecurringModalOpen(false)}>
          <div className="recurring-todo-modal-header">
            <h4>重复清单</h4>
            <button className="icon-button dashboard-add-button" type="button" onClick={openRecurringCreate} aria-label="新增重复清单">
              <Plus size={18} />
            </button>
          </div>

          {recurringTodos.length === 0 ? (
            <div className="table-state compact-state">暂无重复清单</div>
          ) : (
            <div className="recurring-todo-list">
              {recurringTodos.map((todo) => (
                <div className="recurring-todo-row" key={todo.id}>
                  <button className="icon-button danger-icon-button" type="button" onClick={() => setDeletingRecurringTodo(todo)} aria-label={`删除 ${todo.title}`}>
                    <Trash2 size={17} />
                  </button>
                  <strong>{todo.title}</strong>
                  <span>{getRecurringTodoRuleLabel(todo)}</span>
                </div>
              ))}
            </div>
          )}
        </SystemModal>
      ) : null}

      {recurringModalOpen && recurringCreateOpen ? (
        <SystemModal
          title="新增重复清单"
          ariaLabel="新增重复清单"
          wide={false}
          onClose={() => setRecurringCreateOpen(false)}
          footer={
            <>
              <button className="secondary-button compact-button" type="button" onClick={() => setRecurringCreateOpen(false)} disabled={savingRecurring}>
                取消
              </button>
              <button className="primary-button compact-button" type="submit" form="dashboard-recurring-todo-form" disabled={savingRecurring}>
                {savingRecurring ? '新增中' : '新增'}
              </button>
            </>
          }
        >
          <form id="dashboard-recurring-todo-form" className="recurring-todo-form" onSubmit={handleAddRecurringTodo}>
            <label className="form-field">
              <span>任务名称</span>
              <input
                value={recurringForm.title}
                onChange={(event) => setRecurringForm((current) => ({ ...current, title: event.target.value }))}
                autoFocus
                required
              />
            </label>

            <fieldset className="recurring-rule-fieldset">
              <legend>重复规则</legend>
              {(Object.keys(recurringTodoFrequencyLabels) as RecurringTodoFrequency[]).map((frequency) => (
                <label className="recurring-rule-option" key={frequency}>
                  <input
                    type="radio"
                    name="recurring-frequency"
                    checked={recurringForm.frequency === frequency}
                    onChange={() => updateRecurringFrequency(frequency)}
                  />
                  <span>{recurringTodoFrequencyLabels[frequency]}</span>
                </label>
              ))}
            </fieldset>

            {recurringForm.frequency === 'weekly' ? (
              <div className="recurring-extra-options">
                {weekdayOptions.map((day) => (
                  <label className="recurring-check-option" key={day.value}>
                    <input type="checkbox" checked={(recurringForm.weekly_days ?? []).includes(day.value)} onChange={() => toggleWeeklyDay(day.value)} />
                    <span>{day.label}</span>
                  </label>
                ))}
              </div>
            ) : null}

            {recurringForm.frequency === 'monthly' ? (
              <label className="form-field">
                <span>每月几号</span>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={recurringForm.monthly_day ?? 6}
                  onChange={(event) => setRecurringForm((current) => ({ ...current, monthly_day: Number(event.target.value) }))}
                />
              </label>
            ) : null}
          </form>
        </SystemModal>
      ) : null}

      {deletingRecurringTodo ? (
        <SystemModal
          title="删除重复清单"
          ariaLabel="删除重复清单"
          wide={false}
          onClose={() => setDeletingRecurringTodo(null)}
          footer={
            <>
              <button className="secondary-button compact-button" type="button" onClick={() => setDeletingRecurringTodo(null)} disabled={savingRecurring}>
                取消
              </button>
              <button className="primary-button compact-button danger-confirm-button" type="button" onClick={handleDeleteRecurringTodo} disabled={savingRecurring}>
                确定删除
              </button>
            </>
          }
        >
          <div className="delete-recurring-confirm">
            <p>确定删除：</p>
            <strong>{deletingRecurringTodo.title}</strong>
            <p>重复规则：</p>
            <span>{getRecurringTodoRuleLabel(deletingRecurringTodo)}</span>
            <em>此操作无法恢复</em>
          </div>
        </SystemModal>
      ) : null}
    </section>
  );
}

function formatRelativeDate(date: string) {
  const today = startOfDay(new Date());
  const target = startOfDay(new Date(`${date}T00:00:00`));
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);

  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '明天';

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
  }).format(target);
}

function formatEventTime(event: ScheduleEvent) {
  return event.start_time ? `${event.start_time.slice(0, 5)} ` : '';
}

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '操作失败。';
}
