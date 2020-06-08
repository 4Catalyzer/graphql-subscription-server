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

import { GraphQLObjectType, GraphQLSchema } from 'graphql';

import { AddTodoMutation } from './mutations/AddTodoMutation';
import { ChangeTodoStatusMutation } from './mutations/ChangeTodoStatusMutation';
import { MarkAllTodosMutation } from './mutations/MarkAllTodosMutation';
import { RemoveCompletedTodosMutation } from './mutations/RemoveCompletedTodosMutation';
import { RemoveTodoMutation } from './mutations/RemoveTodoMutation';
import { RenameTodoMutation } from './mutations/RenameTodoMutation';
import { GraphQLUser, nodeField } from './nodes';
import AddTodoSubscription from './subscriptions/AddTodoSubscription';
import RemoveTodoSubscription from './subscriptions/RemoveTodoSubscription';
import UpdateTodoSubscription from './subscriptions/UpdateTodoSubscription';

const Query = new GraphQLObjectType({
  name: 'Query',
  fields: {
    node: nodeField,
    viewer: {
      type: GraphQLUser,
      resolve: (_obj, _args, { database }) => database.getViewer(),
    },
  },
});

const Mutation = new GraphQLObjectType({
  name: 'Mutation',
  fields: {
    addTodo: AddTodoMutation,
    changeTodoStatus: ChangeTodoStatusMutation,
    markAllTodos: MarkAllTodosMutation,
    removeCompletedTodos: RemoveCompletedTodosMutation,
    removeTodo: RemoveTodoMutation,
    renameTodo: RenameTodoMutation,
  },
});

const Subscription = new GraphQLObjectType({
  name: 'Subscription',
  fields: {
    addTodoSubscription: AddTodoSubscription,
    removeTodoSubscription: RemoveTodoSubscription,
    updateTodoSubscription: UpdateTodoSubscription,
  },
});

export const schema = new GraphQLSchema({
  query: Query,
  mutation: Mutation,
  subscription: Subscription,
});
