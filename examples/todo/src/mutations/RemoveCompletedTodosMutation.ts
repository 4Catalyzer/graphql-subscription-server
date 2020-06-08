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

import { Disposable, Environment, commitMutation, graphql } from 'react-relay';
import { ConnectionHandler, RecordSourceSelectorProxy } from 'relay-runtime';

import { RemoveCompletedTodosInput } from './__generated__/RemoveCompletedTodosMutation.graphql';
import { TodoListFooter_user as User } from './__generated__/TodoListFooter_user.graphql';

type Todos = NonNullable<User['todos']>;

const mutation = graphql`
  mutation RemoveCompletedTodosMutation($input: RemoveCompletedTodosInput!) {
    removeCompletedTodos(input: $input) {
      deletedTodoIds
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
  deletedIDs: ReadonlyArray<string>,
) {
  const userProxy = store.get(user.id)!;
  const conn = ConnectionHandler.getConnection(userProxy, 'TodoList_todos');

  // Purposefully type forEach as void, to toss the result of deleteNode
  deletedIDs.forEach((deletedID: string): void =>
    ConnectionHandler.deleteNode(conn!, deletedID),
  );
}

function commit(
  environment: Environment,
  todos: Todos,
  user: User,
): Disposable {
  const input: RemoveCompletedTodosInput = {
    userId: user.userId,
  };

  return commitMutation(environment, {
    mutation,
    variables: {
      input,
    },
    updater: (store: RecordSourceSelectorProxy) => {
      const payload = store.getRootField('removeCompletedTodos')!;
      const deletedIds = payload.getValue('deletedTodoIds') as string[];

      sharedUpdater(store, user, deletedIds);
    },
    optimisticUpdater: (store: RecordSourceSelectorProxy) => {
      // Relay returns Maybe types a lot of times in a connection that we need to cater for
      const completedNodeIds: ReadonlyArray<string> = todos.edges
        ? todos.edges
            .filter(Boolean)
            .map((edge) => edge!.node)
            .filter(Boolean)
            .filter((node): boolean => node!.complete)
            .map((node): string => node!.id)
        : [];

      sharedUpdater(store, user, completedNodeIds);
    },
  });
}

export default { commit };
