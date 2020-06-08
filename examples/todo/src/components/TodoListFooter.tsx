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

import React from 'react';
import { RelayProp, createFragmentContainer, graphql } from 'react-relay';

import RemoveCompletedTodosMutation from '../mutations/RemoveCompletedTodosMutation';
import { TodoListFooter_user as User } from './__generated__/TodoListFooter_user.graphql';

interface Props {
  readonly relay: RelayProp;
  readonly user: User;
}

const TodoListFooter = ({
  relay,
  user,
  user: { todos, completedCount, totalCount },
}: Props) => {
  const completedEdges =
    todos && todos.edges
      ? todos.edges.filter((edge) => edge?.node?.complete)
      : [];

  const handleRemoveCompletedTodosClick = () => {
    RemoveCompletedTodosMutation.commit(
      relay.environment,
      {
        edges: completedEdges,
      },
      user,
    );
  };

  const numRemainingTodos = totalCount - completedCount;

  return (
    <footer className="footer">
      <span className="todo-count">
        <strong>{numRemainingTodos}</strong> item
        {numRemainingTodos === 1 ? '' : 's'} left
      </span>

      {completedCount > 0 && (
        <button
          className="clear-completed"
          onClick={handleRemoveCompletedTodosClick}>
          Clear completed
        </button>
      )}
    </footer>
  );
};

export default createFragmentContainer(TodoListFooter, {
  user: graphql`
    fragment TodoListFooter_user on User {
      id
      userId
      completedCount
      todos(
        first: 2147483647 # max GraphQLInt
      ) @connection(key: "TodoList_todos") {
        edges {
          node {
            id
            complete
          }
        }
      }
      totalCount
    }
  `,
});
