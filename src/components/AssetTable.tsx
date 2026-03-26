import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import { listAssets, deleteAsset } from '../db/queries/assets.js';
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
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  const reload = () => {
    try {
      setAssets(listAssets(getDb()));
    } catch {
      setAssets([]);
    }
  };

  // Chargement initial
  useEffect(() => { reload(); }, []);

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
      // Confirmation de suppression en cours
      if (deleteConfirm !== null) {
        if (input === 'o') {
          try {
            deleteAsset(getDb(), deleteConfirm.id);
          } catch {
            // ignore
          }
          setDeleteConfirm(null);
          reload();
        } else if (input === 'n' || key.escape) {
          setDeleteConfirm(null);
        }
        return;
      }

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
      if (input === 'd' && filtered.length > 0) {
        const asset = filtered[clampedIndex];
        setDeleteConfirm({ id: asset.id, name: asset.name });
        return;
      }
      if (input === 'D') {
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
        <Box width={2} flexShrink={0} />
        <Box width={8}  flexShrink={0}><Text bold color="blue">ID</Text></Box>
        <Box width={2}  flexShrink={0} />
        <Box width={20} flexShrink={0}><Text bold color="blue">Nom</Text></Box>
        <Box width={2}  flexShrink={0} />
        <Box width={13} flexShrink={0}><Text bold color="blue">Type</Text></Box>
        <Box width={2}  flexShrink={0} />
        <Box width={15} flexShrink={0}><Text bold color="blue">Classification</Text></Box>
        <Box width={2}  flexShrink={0} />
        <Box width={14} flexShrink={0}><Text bold color="blue">Propriétaire</Text></Box>
        <Box width={2}  flexShrink={0} />
        <Box width={14} flexShrink={0}><Text bold color="blue">Statut</Text></Box>
        <Box width={2}  flexShrink={0} />
        <Box flexShrink={0}><Text bold color="blue">Révision</Text></Box>
      </Box>
      <Box>
        <Box width={2}  flexShrink={0} />
        <Box width={8}  flexShrink={0}><Text color="blue">{'─'.repeat(8)}</Text></Box>
        <Box width={2}  flexShrink={0} />
        <Box width={20} flexShrink={0}><Text color="blue">{'─'.repeat(20)}</Text></Box>
        <Box width={2}  flexShrink={0} />
        <Box width={13} flexShrink={0}><Text color="blue">{'─'.repeat(13)}</Text></Box>
        <Box width={2}  flexShrink={0} />
        <Box width={15} flexShrink={0}><Text color="blue">{'─'.repeat(15)}</Text></Box>
        <Box width={2}  flexShrink={0} />
        <Box width={14} flexShrink={0}><Text color="blue">{'─'.repeat(14)}</Text></Box>
        <Box width={2}  flexShrink={0} />
        <Box width={14} flexShrink={0}><Text color="blue">{'─'.repeat(14)}</Text></Box>
        <Box width={2}  flexShrink={0} />
        <Box flexShrink={0}><Text color="blue">{'─'.repeat(10)}</Text></Box>
      </Box>

      {/* Lignes */}
      {filtered.length === 0 && (
        <Box marginTop={1}>
          <Text color="gray">Aucun asset trouvé.</Text>
        </Box>
      )}
      {filtered.map((asset, index) => {
        const isSelected = index === clampedIndex && !filterFocused;

        return (
          <Box key={asset.id}>
            <Box width={2}  flexShrink={0}><Text bold={isSelected} inverse={isSelected}>{isSelected ? '> ' : '  '}</Text></Box>
            <Box width={8}  flexShrink={0}><Text bold={isSelected} inverse={isSelected}>{asset.id.substring(0, 8)}</Text></Box>
            <Box width={2}  flexShrink={0} />
            <Box width={20} flexShrink={0}><Text bold={isSelected} inverse={isSelected}>{col(asset.name, 20)}</Text></Box>
            <Box width={2}  flexShrink={0} />
            <Box width={13} flexShrink={0}><Text bold={isSelected} inverse={isSelected}>{col(asset.type, 13)}</Text></Box>
            <Box width={2}  flexShrink={0} />
            <Box width={15} flexShrink={0}><ClassificationBadge classification={asset.classification} /></Box>
            <Box width={2}  flexShrink={0} />
            <Box width={14} flexShrink={0}><Text bold={isSelected} inverse={isSelected}>{col(asset.owner, 14)}</Text></Box>
            <Box width={2}  flexShrink={0} />
            <Box width={14} flexShrink={0}><StatusBadge status={asset.status} /></Box>
            <Box width={2}  flexShrink={0} />
            <Box flexShrink={0}><Text bold={isSelected} inverse={isSelected}>{formatDate(asset.next_review_date)}</Text></Box>
          </Box>
        );
      })}

      {/* Confirmation suppression */}
      {deleteConfirm && (
        <Box marginTop={1}>
          <Text color="yellow">Supprimer "{deleteConfirm.name}" ? </Text>
          <Text color="white">(o/n)</Text>
        </Box>
      )}

      {/* Aide clavier */}
      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text color="gray">
          ↑↓/jk naviguer · Enter détail · n nouveau · d supprimer · D dashboard · o owners · Tab filtre · q quitter
        </Text>
      </Box>
    </Box>
  );
}
