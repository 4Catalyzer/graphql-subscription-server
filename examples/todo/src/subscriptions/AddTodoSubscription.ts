import { graphql, requestSubscription } from 'react-relay';
import { ConnectionHandler } from 'relay-runtime';

import { environment } from '../app';
import { AddTodoSubscription } from './__generated__/AddTodoSubscription.graphql';

export default function addTodoSubscription() {
  return requestSubscription<AddTodoSubscription>(environment, {
    subscription: graphql`
      subscription AddTodoSubscription($input: AddTodoSubscriptionInput!) {
        addTodoSubscription(input: $input) {
          todoEdge {
            __typename
            node {
              ...Todo_todo
            }
          }
          viewer {
            id
            totalCount
          }
        }
      }
    `,
    variables: { input: {} },
    updater: (store) => {
      const rootField = store.getRootField('addTodoSubscription');
      const viewer = rootField.getLinkedRecord('viewer');
      const newEdge = rootField.getLinkedRecord('todoEdge');
      const connection = ConnectionHandler.getConnection(
        viewer,
        'TodoList_todos',
      );

      if (connection) {
        ConnectionHandler.insertEdgeAfter(connection, newEdge);
      }
    },
  });
}
