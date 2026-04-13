import React from 'react';
import { Text } from 'ink';
import type { Classification } from '../../types/asset.js';

interface ClassificationBadgeProps {
  classification: Classification | null;
}

export function ClassificationBadge({ classification }: ClassificationBadgeProps): React.ReactElement {
  if (classification === null) {
    return <Text color="gray">—</Text>;
  }

  switch (classification) {
    case 'secret':
      return <Text color="red" bold>▲ {classification}</Text>;
    case 'confidentiel':
      return <Text color="red">◆ {classification}</Text>;
    case 'interne':
      return <Text color="yellow">● {classification}</Text>;
    case 'public':
      return <Text color="green">○ {classification}</Text>;
  }
}
