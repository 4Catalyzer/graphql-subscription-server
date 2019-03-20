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
  GraphQLBoolean,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} from 'graphql';

import {
  connectionArgs,
  connectionDefinitions,
  connectionFromArray,
  cursorForObjectInConnection,
  fromGlobalId,
  globalIdField,
  mutationWithClientMutationId,
  nodeDefinitions,
  toGlobalId,
} from 'graphql-relay';

import { subscriptionWithClientId } from 'graphql-relay-subscription';

import { Todo, User } from './database';

const { nodeInterface, nodeField } = nodeDefinitions(
  (globalId, { database }) => {
    const { type, id } = fromGlobalId(globalId);
    if (type === 'Todo') {
      return database.getTodo(id);
    }
    if (type === 'User') {
      return database.getUser(id);
    }
    return null;
  },
  obj => {
    /* eslint-disable no-use-before-define */
    if (obj instanceof Todo) {
      return GraphQLTodo;
    }
    if (obj instanceof User) {
      return GraphQLUser;
    }
    /* eslint-enable no-use-before-define */
    return null;
  },
);

const GraphQLTodo = new GraphQLObjectType({
  name: 'Todo',
  fields: {
    id: globalIdField('Todo'),
    text: {
      type: GraphQLString,
      resolve: obj => obj.text,
    },
    complete: {
      type: GraphQLBoolean,
      resolve: obj => obj.complete,
    },
  },
  interfaces: [nodeInterface],
});

const {
  connectionType: TodosConnection,
  edgeType: GraphQLTodoEdge,
} = connectionDefinitions({
  name: 'Todo',
  nodeType: GraphQLTodo,
});

const GraphQLUser = new GraphQLObjectType({
  name: 'User',
  fields: {
    id: globalIdField('User'),
    todos: {
      type: TodosConnection,
      args: {
        status: {
          type: GraphQLString,
          defaultValue: 'any',
        },
        ...connectionArgs,
      },
      resolve: (obj, { status, ...args }, { database }) =>
        connectionFromArray(database.getTodos(status), args),
    },
    totalCount: {
      type: GraphQLInt,
      resolve: (obj, args, { database }) => database.getTodos().length,
    },
    completedCount: {
      type: GraphQLInt,
      resolve: (obj, args, { database }) =>
        database.getTodos('completed').length,
    },
  },
  interfaces: [nodeInterface],
});

const Root = new GraphQLObjectType({
  name: 'Root',
  fields: {
    viewer: {
      type: GraphQLUser,
      resolve: (obj, args, { database }) => database.getViewer(),
    },
    node: nodeField,
  },
});

const GraphQLAddTodoMutation = mutationWithClientMutationId({
  name: 'AddTodo',
  inputFields: {
    text: { type: new GraphQLNonNull(GraphQLString) },
  },
  outputFields: {
    todoEdge: {
      type: GraphQLTodoEdge,
      resolve: ({ localTodoId }, args, { database }) => {
        const todo = database.getTodo(localTodoId);
        return {
          cursor: cursorForObjectInConnection(database.getTodos(), todo),
          node: todo,
        };
      },
    },
    viewer: {
      type: GraphQLUser,
      resolve: (obj, args, { database }) => database.getViewer(),
    },
  },
  mutateAndGetPayload: ({ text }, { database }) => {
    const localTodoId = database.addTodo(text);
    return { localTodoId };
  },
});

const GraphQLChangeTodoStatusMutation = mutationWithClientMutationId({
  name: 'ChangeTodoStatus',
  inputFields: {
    complete: { type: new GraphQLNonNull(GraphQLBoolean) },
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  outputFields: {
    todo: {
      type: GraphQLTodo,
      resolve: ({ localTodoId }, args, { database }) =>
        database.getTodo(localTodoId),
    },
    viewer: {
      type: GraphQLUser,
      resolve: (obj, args, { database }) => database.getViewer(),
    },
  },
  mutateAndGetPayload: ({ id, complete }, { database }) => {
    const localTodoId = fromGlobalId(id).id;
    database.changeTodoStatus(localTodoId, complete);
    return { localTodoId };
  },
});

const GraphQLMarkAllTodosMutation = mutationWithClientMutationId({
  name: 'MarkAllTodos',
  inputFields: {
    complete: { type: new GraphQLNonNull(GraphQLBoolean) },
  },
  outputFields: {
    changedTodos: {
      type: new GraphQLList(GraphQLTodo),
      resolve: ({ changedTodoLocalIds }, args, { database }) =>
        changedTodoLocalIds.map(d => database.getTodo(d)),
    },
    viewer: {
      type: GraphQLUser,
      resolve: (obj, args, { database }) => database.getViewer(),
    },
  },
  mutateAndGetPayload: ({ complete }, { database }) => {
    const changedTodoLocalIds = database.markAllTodos(complete);
    return { changedTodoLocalIds };
  },
});

// TODO: Support plural deletes
const GraphQLRemoveCompletedTodosMutation = mutationWithClientMutationId({
  name: 'RemoveCompletedTodos',
  outputFields: {
    deletedTodoIds: {
      type: new GraphQLList(GraphQLString),
      resolve: ({ deletedTodoIds }) => deletedTodoIds,
    },
    viewer: {
      type: GraphQLUser,
      resolve: (obj, args, { database }) => database.getViewer(),
    },
  },
  mutateAndGetPayload: (obj, { database }) => {
    const deletedTodoLocalIds = database.removeCompletedTodos();
    const deletedTodoIds = deletedTodoLocalIds.map(
      toGlobalId.bind(null, 'Todo'),
    );
    return { deletedTodoIds };
  },
});

const GraphQLRemoveTodoMutation = mutationWithClientMutationId({
  name: 'RemoveTodo',
  inputFields: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  outputFields: {
    deletedTodoId: {
      type: GraphQLID,
      resolve: ({ id }) => id,
    },
    viewer: {
      type: GraphQLUser,
      resolve: (obj, args, { database }) => database.getViewer(),
    },
  },
  mutateAndGetPayload: ({ id }, { database }) => {
    const localTodoId = fromGlobalId(id).id;
    database.removeTodo(localTodoId);
    return { id };
  },
});

const GraphQLRenameTodoMutation = mutationWithClientMutationId({
  name: 'RenameTodo',
  inputFields: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    text: { type: new GraphQLNonNull(GraphQLString) },
  },
  outputFields: {
    todo: {
      type: GraphQLTodo,
      resolve: ({ localTodoId }, args, { database }) =>
        database.getTodo(localTodoId),
    },
  },
  mutateAndGetPayload: ({ id, text }, { database }) => {
    const localTodoId = fromGlobalId(id).id;
    database.renameTodo(localTodoId, text);
    return { localTodoId };
  },
});

const GraphQLAddTodoSubscription = subscriptionWithClientId({
  name: 'AddTodoSubscription',
  outputFields: {
    todo: {
      type: GraphQLTodo,
      resolve: obj => obj,
    },
    todoEdge: {
      type: GraphQLTodoEdge,
      resolve: (obj, args, { database }) => ({
        cursor: cursorForObjectInConnection(
          database.getTodos(),
          database.getTodo(obj.id),
        ),
        node: obj,
      }),
    },
    viewer: {
      type: GraphQLUser,
      resolve: (obj, args, { database }) => database.getViewer(),
    },
  },
  subscribe: (input, context) => context.subscribe('add_todo'),
});

const GraphQLRemoveTodoSubscription = subscriptionWithClientId({
  name: 'RemoveTodoSubscription',
  outputFields: {
    deletedTodoId: {
      type: GraphQLID,
      resolve: ({ id }) => toGlobalId('Todo', id),
    },
    viewer: {
      type: GraphQLUser,
      resolve: (obj, args, { database }) => database.getViewer(),
    },
  },
  subscribe: (input, context) => context.subscribe('delete_todo'),
});

const GraphQLUpdateTodoSubscription = subscriptionWithClientId({
  name: 'UpdateTodoSubscription',
  inputFields: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  outputFields: {
    todo: {
      type: GraphQLTodo,
      resolve: obj => obj,
    },
    viewer: {
      type: GraphQLUser,
      resolve: (obj, args, { database }) => database.getViewer(),
    },
  },
  subscribe: ({ id }, context) =>
    context.subscribe(`update_todo_${fromGlobalId(id).id}`),
});

const Mutation = new GraphQLObjectType({
  name: 'Mutation',
  fields: {
    addTodo: GraphQLAddTodoMutation,
    changeTodoStatus: GraphQLChangeTodoStatusMutation,
    markAllTodos: GraphQLMarkAllTodosMutation,
    removeCompletedTodos: GraphQLRemoveCompletedTodosMutation,
    removeTodo: GraphQLRemoveTodoMutation,
    renameTodo: GraphQLRenameTodoMutation,
  },
});

const Subscription = new GraphQLObjectType({
  name: 'Subscription',
  fields: {
    addTodoSubscription: GraphQLAddTodoSubscription,
    removeTodoSubscription: GraphQLRemoveTodoSubscription,
    updateTodoSubscription: GraphQLUpdateTodoSubscription,
  },
});

export const schema = new GraphQLSchema({
  query: Root,
  mutation: Mutation,
  subscription: Subscription,
});
