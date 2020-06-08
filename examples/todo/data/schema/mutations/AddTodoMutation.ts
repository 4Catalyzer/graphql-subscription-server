import { GraphQLID, GraphQLNonNull, GraphQLString } from 'graphql';
import {
  cursorForObjectInConnection,
  mutationWithClientMutationId,
} from 'graphql-relay';

import { User } from '../../database';
import { GraphQLTodoEdge, GraphQLUser } from '../nodes';

type Input = {
  readonly text: string;
  readonly userId: string;
};

type Payload = {
  readonly todoId: string;
  readonly userId: string;
};

const AddTodoMutation = mutationWithClientMutationId({
  name: 'AddTodo',
  inputFields: {
    text: { type: new GraphQLNonNull(GraphQLString) },
    userId: { type: new GraphQLNonNull(GraphQLID) },
  },
  outputFields: {
    todoEdge: {
      type: new GraphQLNonNull(GraphQLTodoEdge),
      resolve: ({ todoId }: Payload, _args, { database }) => {
        const todo = database.getTodo(todoId);

        return {
          cursor: cursorForObjectInConnection([...database.getTodos()], todo),
          node: todo,
        };
      },
    },
    user: {
      type: new GraphQLNonNull(GraphQLUser),
      resolve: ({ userId }: Payload, _args, { database }): User =>
        database.getUser(userId),
    },
  },
  mutateAndGetPayload: ({ text, userId }: Input, { database }): Payload => {
    const todoId = database.addTodo(text, false);
    return { todoId, userId };
  },
});

export { AddTodoMutation };
