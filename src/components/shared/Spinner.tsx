import React from 'react';
import InkSpinner from 'ink-spinner';
import { Text } from 'ink';

interface SpinnerProps {
  message?: string;
}

export function Spinner({ message }: SpinnerProps): React.ReactElement {
  return (
    <Text>
      <InkSpinner type="dots" />
      {message ? ` ${message}` : ''}
    </Text>
  );
}
