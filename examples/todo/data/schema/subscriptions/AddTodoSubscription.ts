import { cursorForObjectInConnection } from 'graphql-relay';
import { subscriptionWithClientId } from 'graphql-relay-subscription';

import { GraphQLTodo, GraphQLTodoEdge, GraphQLUser } from '../nodes';

const AddTodoSubscription = subscriptionWithClientId({
  name: 'AddTodoSubscription',
  outputFields: {
    todo: {
      type: GraphQLTodo,
      resolve: (obj) => obj,
    },
    todoEdge: {
      type: GraphQLTodoEdge,
      resolve: (obj, _args, { database }) => ({
        cursor: cursorForObjectInConnection(
          database.getTodos(),
          database.getTodo(obj.id),
        ),
        node: obj,
      }),
    },
    viewer: {
      type: GraphQLUser,
      resolve: (_obj, _args, { database }) => {
        return database.getViewer();
      },
    },
  },
  subscribe: (_input, context) => context.subscribe('add_todo'),
});

export default AddTodoSubscription;
