import { supabase } from '../lib/supabase';
import type { TodoItem } from '../types/database';

export const todoService = {
  async getMyOpenTodos() {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('todo_items')
      .select('*')
      .eq('profile_id', userId)
      .eq('is_completed', false)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []) as TodoItem[];
  },

  async createTodo(title: string) {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('todo_items')
      .insert({
        profile_id: userId,
        title: title.trim(),
      })
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return data as TodoItem;
  },

  async completeTodo(id: string) {
    const { error } = await supabase
      .from('todo_items')
      .update({
        is_completed: true,
        completed_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      throw error;
    }
  },
};

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  const userId = data.user?.id;

  if (!userId) {
    throw new Error('请先登录后再管理工作清单。');
  }

  return userId;
}
