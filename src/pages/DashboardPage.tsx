import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CalendarDays, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SystemModal } from '../components/SystemModal';
import { scheduleEventService } from '../services/schedule-event.service';
import { todoService } from '../services/todo.service';
import type { ScheduleEvent, TodoItem } from '../types/database';

export function DashboardPage() {
  const navigate = useNavigate();
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [completedTodoIds, setCompletedTodoIds] = useState<Set<string>>(new Set());
  const [upcomingEvents, setUpcomingEvents] = useState<ScheduleEvent[]>([]);
  const [todoModalOpen, setTodoModalOpen] = useState(false);
  const [todoTitle, setTodoTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingTodo, setSavingTodo] = useState(false);
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
      const [todoList, eventList] = await Promise.all([
        todoService.getMyOpenTodos(),
        scheduleEventService.getMyUpcomingScheduleEvents(7, 5),
      ]);
      setTodos(todoList);
      setUpcomingEvents(eventList);
      setCompletedTodoIds(new Set());
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
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

  return (
    <section className="home-page dashboard-workbench">
      {error ? <p className="form-alert">{error}</p> : null}

      <div className="dashboard-panel todo-panel">
        <div className="dashboard-panel-header">
          <h3>工作清单</h3>
          <button className="icon-button dashboard-add-button" type="button" onClick={() => setTodoModalOpen(true)} aria-label="新增工作清单">
            <Plus size={18} />
          </button>
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
