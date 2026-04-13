import React from 'react';
import { Text } from 'ink';
import type { AssetStatus } from '../../types/asset.js';

interface StatusBadgeProps {
  status: AssetStatus;
}

const STATUS_COLORS: Record<AssetStatus, string> = {
  actif: 'green',
  en_maintenance: 'yellow',
  en_cours_de_mise_au_rebut: 'red',
  retiré: 'gray',
};

const STATUS_LABELS: Record<AssetStatus, string> = {
  actif: 'actif',
  en_maintenance: 'en maintenance',
  en_cours_de_mise_au_rebut: 'mise au rebut',
  retiré: 'retiré',
};

export function StatusBadge({ status }: StatusBadgeProps): React.ReactElement {
  return (
    <Text color={STATUS_COLORS[status]}>
      {STATUS_LABELS[status]}
    </Text>
  );
}
