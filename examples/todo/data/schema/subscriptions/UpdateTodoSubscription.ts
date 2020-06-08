import { GraphQLID, GraphQLNonNull } from 'graphql';
import { fromGlobalId } from 'graphql-relay';
import { subscriptionWithClientId } from 'graphql-relay-subscription';

import { GraphQLTodo, GraphQLUser } from '../nodes';

const UpdateTodoSubscription = subscriptionWithClientId({
  name: 'UpdateTodoSubscription',
  inputFields: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  outputFields: {
    todo: {
      type: GraphQLTodo,
      resolve: (obj) => obj,
    },
    viewer: {
      type: GraphQLUser,
      resolve: (_obj, _args, { database }) => database.getViewer(),
    },
  },
  subscribe: ({ id }, context) =>
    context.subscribe(`update_todo_${fromGlobalId(id).id}`),
});

export default UpdateTodoSubscription;
