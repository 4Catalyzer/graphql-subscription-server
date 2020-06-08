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

import { GraphQLID, GraphQLNonNull, GraphQLString } from 'graphql';
import { fromGlobalId, mutationWithClientMutationId } from 'graphql-relay';

import { Todo } from '../../database';
import { GraphQLTodo } from '../nodes';

type Input = {
  readonly id: string;
  readonly text: string;
};

type Payload = {
  readonly localTodoId: string;
};

const RenameTodoMutation = mutationWithClientMutationId({
  name: 'RenameTodo',
  inputFields: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    text: { type: new GraphQLNonNull(GraphQLString) },
  },
  outputFields: {
    todo: {
      type: new GraphQLNonNull(GraphQLTodo),
      resolve: ({ localTodoId }: Payload, _args, { database }): Todo =>
        database.getTodo(localTodoId),
    },
  },
  mutateAndGetPayload: ({ id, text }: Input, { database }): Payload => {
    const localTodoId = fromGlobalId(id).id;
    database.renameTodo(localTodoId, text);

    return { localTodoId };
  },
});

export { RenameTodoMutation };
