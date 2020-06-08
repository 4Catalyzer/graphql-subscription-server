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

import { GraphQLBoolean, GraphQLID, GraphQLNonNull } from 'graphql';
import { fromGlobalId, mutationWithClientMutationId } from 'graphql-relay';

import { Todo, User } from '../../database';
import { GraphQLTodo, GraphQLUser } from '../nodes';

type Input = {
  readonly complete: boolean;
  readonly id: string;
  readonly userId: string;
};

type Payload = {
  readonly todoId: string;
  readonly userId: string;
};

const ChangeTodoStatusMutation = mutationWithClientMutationId({
  name: 'ChangeTodoStatus',
  inputFields: {
    complete: { type: new GraphQLNonNull(GraphQLBoolean) },
    id: { type: new GraphQLNonNull(GraphQLID) },
    userId: { type: new GraphQLNonNull(GraphQLID) },
  },
  outputFields: {
    todo: {
      type: new GraphQLNonNull(GraphQLTodo),
      resolve: ({ todoId }: Payload, _args, { database }): Todo =>
        database.getTodo(todoId),
    },
    user: {
      type: new GraphQLNonNull(GraphQLUser),
      resolve: ({ userId }: Payload, _args, { database }): User =>
        database.getUser(userId),
    },
  },
  mutateAndGetPayload: (
    { id, complete, userId }: Input,
    { database },
  ): Payload => {
    const todoId = fromGlobalId(id).id;
    database.changeTodoStatus(todoId, complete);

    return { todoId, userId };
  },
});

export { ChangeTodoStatusMutation };
