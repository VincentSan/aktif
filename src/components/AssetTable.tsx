import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import { listAssets } from '../db/queries/assets.js';
import { getDb } from '../context.js';
import { formatDate } from '../utils/date.js';
import { StatusBadge } from './shared/StatusBadge.js';
import { ClassificationBadge } from './shared/ClassificationBadge.js';
import { col } from './shared/col.js';
import type { Asset } from '../types/asset.js';
import type { NavigateFunction } from './App.js';

interface AssetTableProps {
  onNavigate: NavigateFunction;
}

export function AssetTable({ onNavigate }: AssetTableProps): React.ReactElement {
  const { exit } = useApp();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filter, setFilter] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filterFocused, setFilterFocused] = useState(false);

  // Chargement initial
  useEffect(() => {
    try {
      const rows = listAssets(getDb());
      setAssets(rows);
    } catch {
      setAssets([]);
    }
  }, []);

  // Filtrage en temps réel sur name et owner
  const filtered = assets.filter((a) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      (a.owner ?? '').toLowerCase().includes(q)
    );
  });

  // Remet la sélection à 0 quand le filtre change
  useEffect(() => { setSelectedIndex(0); }, [filter]);

  const clampedIndex = filtered.length === 0 ? 0 : Math.min(selectedIndex, filtered.length - 1);

  useInput(
    (input, key) => {
      // Tab : bascule le focus filtre/liste
      if (key.tab) {
        setFilterFocused((prev) => !prev);
        return;
      }

      // Quand le filtre a le focus, on ne gère pas les raccourcis de liste
      if (filterFocused) return;

      if (key.upArrow || input === 'k') {
        setSelectedIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (key.downArrow || input === 'j') {
        setSelectedIndex((i) => Math.min(filtered.length - 1, i + 1));
        return;
      }
      if (key.return && filtered.length > 0) {
        onNavigate('detail', filtered[clampedIndex].id);
        return;
      }
      if (input === 'n') {
        onNavigate('form', undefined, 'add');
        return;
      }
      if (input === 'd') {
        onNavigate('dashboard');
        return;
      }
      if (input === 'o') {
        onNavigate('owners');
        return;
      }
      if (input === 'q') {
        exit();
        return;
      }
    },
  );

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* Barre de filtre */}
      <Box marginBottom={1}>
        <Text color={filterFocused ? 'cyan' : 'white'}>Filtre: [</Text>
        <TextInput
          value={filter}
          onChange={setFilter}
          focus={filterFocused}
          placeholder="nom ou propriétaire…"
        />
        <Text color={filterFocused ? 'cyan' : 'white'}>]</Text>
        {!filterFocused && (
          <Text color="gray">  Tab pour activer le filtre</Text>
        )}
      </Box>

      {/* En-tête tableau */}
      <Box>
        <Text bold color="blue">
          {'  '}
          {col('ID', 8)}
          {'  '}
          {col('Nom', 20)}
          {'  '}
          {col('Type', 13)}
          {'  '}
          {col('Classification', 15)}
          {'  '}
          {col('Propriétaire', 14)}
          {'  '}
          {'Statut          '}
          {'Révision'}
        </Text>
      </Box>
      <Box>
        <Text color="blue">
          {'  '}
          {'─'.repeat(8)}
          {'  '}
          {'─'.repeat(20)}
          {'  '}
          {'─'.repeat(13)}
          {'  '}
          {'─'.repeat(15)}
          {'  '}
          {'─'.repeat(14)}
          {'  '}
          {'─'.repeat(14)}
          {'  '}
          {'─'.repeat(10)}
        </Text>
      </Box>

      {/* Lignes */}
      {filtered.length === 0 && (
        <Box marginTop={1}>
          <Text color="gray">Aucun asset trouvé.</Text>
        </Box>
      )}
      {filtered.map((asset, index) => {
        const isSelected = index === clampedIndex && !filterFocused;
        const prefix = isSelected ? '> ' : '  ';

        return (
          <Box key={asset.id}>
            <Text bold={isSelected} inverse={isSelected}>
              {prefix}
              {col(asset.id, 8)}
              {'  '}
              {col(asset.name, 20)}
              {'  '}
              {col(asset.type, 13)}
              {'  '}
            </Text>
            <ClassificationBadge classification={asset.classification} />
            <Text bold={isSelected} inverse={isSelected}>
              {'  '}
              {col(asset.owner, 14)}
              {'  '}
            </Text>
            <StatusBadge status={asset.status} />
            <Text bold={isSelected} inverse={isSelected}>
              {'  '}
              {formatDate(asset.next_review_date)}
            </Text>
          </Box>
        );
      })}

      {/* Aide clavier */}
      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text color="gray">
          ↑↓/jk naviguer · Enter détail · n nouveau · d dashboard · o owners · Tab filtre · q quitter
        </Text>
      </Box>
    </Box>
  );
}
