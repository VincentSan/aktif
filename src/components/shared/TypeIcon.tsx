import React from 'react';
import { Text } from 'ink';
import type { AssetType } from '../../types/asset.js';

// Unicode simple characters, compatible with iTerm2, Terminal.app and common Linux emulators
const TYPE_ICONS: Record<AssetType, string> = {
  informationnel: '▪',  // document / data
  logiciel:       '◆',  // software
  matériel:       '■',  // hardware
  service:        '▸',  // service / flow
  personnel:      '●',  // person
};

const TYPE_COLORS: Record<AssetType, string> = {
  informationnel: 'cyan',
  logiciel:       'magenta',
  matériel:       'blue',
  service:        'yellow',
  personnel:      'green',
};

interface TypeIconProps {
  type: AssetType;
}

export function TypeIcon({ type }: TypeIconProps): React.ReactElement {
  return (
    <Text color={TYPE_COLORS[type]}>{TYPE_ICONS[type]}</Text>
  );
}
