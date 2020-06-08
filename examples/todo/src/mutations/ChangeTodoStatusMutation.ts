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
  ChangeTodoStatusInput,
  ChangeTodoStatusMutationResponse,
} from './__generated__/ChangeTodoStatusMutation.graphql';
import { Todo_todo as Todo } from './__generated__/Todo_todo.graphql';
import { Todo_user as User } from './__generated__/Todo_user.graphql';

const mutation = graphql`
  mutation ChangeTodoStatusMutation($input: ChangeTodoStatusInput!) {
    changeTodoStatus(input: $input) {
      todo {
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
  todo: Todo,
  user: User,
): ChangeTodoStatusMutationResponse {
  return {
    changeTodoStatus: {
      todo: {
        complete,
        id: todo.id,
      },
      user: {
        id: user.id,
        completedCount: complete
          ? user.completedCount + 1
          : user.completedCount - 1,
      },
    },
  };
}

function commit(
  environment: Environment,
  complete: boolean,
  todo: Todo,
  user: User,
): Disposable {
  const input: ChangeTodoStatusInput = {
    complete,
    userId: user.userId,
    id: todo.id,
  };

  return commitMutation(environment, {
    mutation,
    variables: {
      input,
    },
    optimisticResponse: getOptimisticResponse(complete, todo, user),
  });
}

export default { commit };
