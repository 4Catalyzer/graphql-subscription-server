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
  RenameTodoInput,
  RenameTodoMutationResponse,
} from '../__generated__/RenameTodoMutation.graphql';
import { Todo_todo as Todo } from '../__generated__/Todo_todo.graphql';

const mutation = graphql`
  mutation RenameTodoMutation($input: RenameTodoInput!) {
    renameTodo(input: $input) {
      todo {
        id
        text
      }
    }
  }
`;

function getOptimisticResponse(
  text: string,
  todo: Todo,
): RenameTodoMutationResponse {
  return {
    renameTodo: {
      todo: {
        text,
        id: todo.id,
      },
    },
  };
}

function commit(
  environment: Environment,
  text: string,
  todo: Todo,
): Disposable {
  const input: RenameTodoInput = {
    text,
    id: todo.id,
  };

  return commitMutation(environment, {
    mutation,
    variables: {
      input,
    },
    optimisticResponse: getOptimisticResponse(text, todo),
  });
}

export default { commit };
