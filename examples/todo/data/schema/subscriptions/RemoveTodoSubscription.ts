import { GraphQLID } from 'graphql';
import { toGlobalId } from 'graphql-relay';
import { subscriptionWithClientId } from 'graphql-relay-subscription';

import { GraphQLUser } from '../nodes';

const RemoveTodoSubscription = subscriptionWithClientId({
  name: 'RemoveTodoSubscription',
  outputFields: {
    deletedTodoId: {
      type: GraphQLID,
      resolve: ({ id }) => toGlobalId('Todo', id),
    },
    viewer: {
      type: GraphQLUser,
      resolve: (_obj, _args, { database }) => database.getViewer(),
    },
  },
  subscribe: (_input, context) => context.subscribe('delete_todo'),
});

export default RemoveTodoSubscription;
