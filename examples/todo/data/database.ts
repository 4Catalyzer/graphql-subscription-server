/**
 * This file provided by Facebook is for non-commercial testing and evaluation
 * purposes only.  Facebook reserves all rights not expressly granted.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * FACEBOOK BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
 * ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// eslint-disable-next-line max-classes-per-file
import { EventEmitter } from 'events';

export class Todo {
  constructor(
    public id: string,
    public text: string,
    public complete: boolean,
  ) {}
}

export class User {
  constructor(public id: string) {}
}

// Mock authenticated ID
export const VIEWER_ID = 'me';

// Mock user data
const viewer = new User(VIEWER_ID);

class Database extends EventEmitter {
  usersById: Record<string, User> = {
    [VIEWER_ID]: viewer,
  };

  nextTodoId = 0;

  todosById = {};

  todoIdsByUser: Record<string, string[]> = {
    [VIEWER_ID]: [],
  };

  emit(topic: string | symbol, data): boolean {
    // Delay the change notification to avoid the subscription update hitting the
    // client before the mutation response.
    setTimeout(() => {
      console.log('emitting data', topic);
      super.emit(topic, data);
    }, 100);

    return true;
  }

  addTodo(text, complete) {
    const todo = new Todo(`${this.nextTodoId++}`, text, !!complete);
    this.todosById[todo.id] = todo;
    this.todoIdsByUser[VIEWER_ID].push(todo.id);
    this.emit('add_todo', todo);
    return todo.id;
  }

  getTodo(id) {
    return this.todosById[id];
  }

  getTodos(status = 'any') {
    const todos = this.todoIdsByUser[VIEWER_ID].map((id) => this.todosById[id]);
    if (status === 'any') {
      return todos;
    }
    return todos.filter((todo) => todo.complete === (status === 'completed'));
  }

  changeTodoStatus(id, complete) {
    const todo = this.getTodo(id);
    todo.complete = complete;
    this.emit(`update_todo_${id}`, todo);
  }

  getUser(id) {
    return this.usersById[id];
  }

  getViewer() {
    return this.getUser(VIEWER_ID);
  }

  markAllTodos(complete) {
    const changedTodos: Todo[] = [];
    this.getTodos().forEach((todo) => {
      if (todo.complete !== complete) {
        todo.complete = complete; // eslint-disable-line no-param-reassign
        changedTodos.push(todo);
        this.emit(`update_todo_${todo.id}`, todo);
      }
    });
    return changedTodos.map((todo) => todo.id);
  }

  removeTodo(id) {
    const todoIndex = this.todoIdsByUser[VIEWER_ID].indexOf(id);
    if (todoIndex !== -1) {
      this.todoIdsByUser[VIEWER_ID].splice(todoIndex, 1);
    }
    this.emit('delete_todo', { id });
    delete this.todosById[id];
  }

  removeCompletedTodos() {
    const todosToRemove = this.getTodos().filter((todo) => todo.complete);
    todosToRemove.forEach((todo) => this.removeTodo(todo.id));
    return todosToRemove.map((todo) => todo.id);
  }

  renameTodo(id, text) {
    const todo = this.getTodo(id);
    todo.text = text;
    this.emit(`update_todo_${id}`, todo);
  }
}

const db = new Database();
db.addTodo('Taste JavaScript', true);
db.addTodo('Buy a unicorn', false);

export default db;
