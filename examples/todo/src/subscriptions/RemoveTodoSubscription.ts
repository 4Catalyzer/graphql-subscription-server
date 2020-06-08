import { graphql, requestSubscription } from 'react-relay';
import { ConnectionHandler } from 'relay-runtime';

import { environment } from '../app';
import { RemoveTodoSubscription } from './__generated__/RemoveTodoSubscription.graphql';

export default function removeTodoSubscription() {
  return requestSubscription<RemoveTodoSubscription>(environment, {
    subscription: graphql`
      subscription RemoveTodoSubscription(
        $input: RemoveTodoSubscriptionInput!
      ) {
        removeTodoSubscription(input: $input) {
          deletedTodoId
          viewer {
            id
            completedCount
            totalCount
          }
        }
      }
    `,
    variables: { input: {} },
    updater: (store) => {
      const rootField = store.getRootField('removeTodoSubscription');
      const deletedId = rootField.getValue('deletedTodoId')!;
      const viewer = rootField.getLinkedRecord('viewer');
      const connection = ConnectionHandler.getConnection(
        viewer,
        'TodoList_todos',
      );

      if (connection) {
        ConnectionHandler.deleteNode(connection, deletedId);
      }
    },
  });
}
