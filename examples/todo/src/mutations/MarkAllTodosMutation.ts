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

import {
  MarkAllTodosInput,
  MarkAllTodosMutationResponse,
} from '../__generated__/MarkAllTodosMutation.graphql';
import { TodoList_user as User } from '../__generated__/TodoList_user.graphql';

type Todos = NonNullable<User['todos']>;

const mutation = graphql`
  mutation MarkAllTodosMutation($input: MarkAllTodosInput!) {
    markAllTodos(input: $input) {
      changedTodos {
        id
        complete
      }
      user {
        id
        completedCount
      }
    }
  }
`;

function getOptimisticResponse(
  complete: boolean,
  todos: Todos,
  user: User,
): MarkAllTodosMutationResponse {
  // Relay returns Maybe types a lot of times in a connection that we need to cater for
  const validNodes =
    todos.edges
      ?.filter(Boolean)
      .map((edge) => edge?.node)
      .filter(Boolean) ?? [];

  const changedTodos = validNodes
    .filter((node) => node!.complete !== complete)
    .map((node) => ({
      complete,
      id: node!.id,
    }));

  return {
    markAllTodos: {
      changedTodos,
      user: {
        id: user.id,
        completedCount: complete ? user.totalCount : 0,
      },
    },
  };
}

function commit(
  environment: Environment,
  complete: boolean,
  todos: NonNullable<User['todos']>,
  user: User,
): Disposable {
  const input: MarkAllTodosInput = {
    complete,
    userId: user.userId,
  };

  return commitMutation(environment, {
    mutation,
    variables: {
      input,
    },
    optimisticResponse: getOptimisticResponse(complete, todos, user),
  });
}

export default { commit };
