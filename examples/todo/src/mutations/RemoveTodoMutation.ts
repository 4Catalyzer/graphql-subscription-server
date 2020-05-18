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

import {
  Disposable,
  Environment,
  RecordSourceSelectorProxy,
  commitMutation,
  graphql,
} from 'react-relay';
import { ConnectionHandler } from 'relay-runtime';

import { RemoveTodoInput } from '../__generated__/RemoveTodoMutation.graphql';
import { Todo_todo as Todo } from '../__generated__/Todo_todo.graphql';
import { Todo_user as User } from '../__generated__/Todo_user.graphql';

const mutation = graphql`
  mutation RemoveTodoMutation($input: RemoveTodoInput!) {
    removeTodo(input: $input) {
      deletedTodoId
      user {
        completedCount
        totalCount
      }
    }
  }
`;

function sharedUpdater(
  store: RecordSourceSelectorProxy,
  user: User,
  deletedID: string,
) {
  const userProxy = store.get(user.id);
  const conn = ConnectionHandler.getConnection(userProxy, 'TodoList_todos');
  ConnectionHandler.deleteNode(conn, deletedID);
}

function commit(environment: Environment, todo: Todo, user: User): Disposable {
  const input: RemoveTodoInput = {
    id: todo.id,
    userId: user.userId,
  };

  return commitMutation(environment, {
    mutation,
    variables: {
      input,
    },
    updater: (store: RecordSourceSelectorProxy) => {
      const payload = store.getRootField('removeTodo');
      const deletedTodoId = payload.getValue('deletedTodoId');

      if (typeof deletedTodoId !== 'string') {
        throw new Error(
          `Expected removeTodo.deletedTodoId to be string, but got: ${typeof deletedTodoId}`,
        );
      }

      sharedUpdater(store, user, deletedTodoId);
    },
    optimisticUpdater: (store: RecordSourceSelectorProxy) => {
      sharedUpdater(store, user, todo.id);
    },
  });
}

export default { commit };
