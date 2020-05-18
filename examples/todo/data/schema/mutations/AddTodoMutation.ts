import { GraphQLID, GraphQLNonNull, GraphQLString } from 'graphql';
import {
  cursorForObjectInConnection,
  mutationWithClientMutationId,
} from 'graphql-relay';

import {
  User,
  addTodo,
  getTodoOrThrow,
  getTodos,
  getUserOrThrow,
} from '../../database';
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
      resolve: ({ todoId }: Payload) => {
        const todo = getTodoOrThrow(todoId);

        return {
          cursor: cursorForObjectInConnection([...getTodos()], todo),
          node: todo,
        };
      },
    },
    user: {
      type: new GraphQLNonNull(GraphQLUser),
      resolve: ({ userId }: Payload): User => getUserOrThrow(userId),
    },
  },
  mutateAndGetPayload: ({ text, userId }: Input): Payload => {
    const todoId = addTodo(text, false);

    return { todoId, userId };
  },
});

export { AddTodoMutation };
