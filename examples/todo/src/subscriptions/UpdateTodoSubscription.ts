import { graphql, requestSubscription } from 'react-relay';

import { environment } from '../app';
import { UpdateTodoSubscription } from './__generated__/UpdateTodoSubscription.graphql';

export default function updateTodoSubscription(
  input: UpdateTodoSubscription['variables']['input'],
) {
  return requestSubscription<UpdateTodoSubscription>(environment, {
    subscription: graphql`
      subscription UpdateTodoSubscription(
        $input: UpdateTodoSubscriptionInput!
      ) {
        updateTodoSubscription(input: $input) {
          todo {
            ...Todo_todo
          }
          viewer {
            id
            completedCount
          }
        }
      }
    `,
    variables: { input },
  });
}
