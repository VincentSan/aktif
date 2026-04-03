import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { AssetTable } from './AssetTable.js';
import { AssetForm } from './AssetForm.js';
import { AssetDetail } from './AssetDetail.js';
import { AssetHistory } from './AssetHistory.js';
import { ComplianceDashboard } from './ComplianceDashboard.js';
import { OwnerManager } from './OwnerManager.js';

type View = 'list' | 'detail' | 'form' | 'history' | 'dashboard' | 'owners';
type FormMode = 'add' | 'edit';

interface AppState {
  view: View;
  selectedAssetId?: string;
  formMode?: FormMode;
}

export type NavigateFunction = (view: View, assetId?: string, formMode?: FormMode) => void;

const MIN_COLS = 100;
const MIN_ROWS = 24;

function isSizeOk(): boolean {
  return (process.stdout.columns ?? 0) >= MIN_COLS && (process.stdout.rows ?? 0) >= MIN_ROWS;
}

export function App(): React.ReactElement {
  const [state, setState] = useState<AppState>({ view: 'list' });
  const [terminalOk, setTerminalOk] = useState<boolean>(isSizeOk());

  useEffect(() => {
    const onResize = () => {
      const ok = isSizeOk();
      if (!ok) process.stdout.write('\x1b[2J\x1b[H');
      setTerminalOk(ok);
    };
    process.stdout.on('resize', onResize);
    return () => {
      process.stdout.off('resize', onResize);
    };
  }, []);

  const onNavigate: NavigateFunction = (view, assetId?, formMode?) => {
    setState({ view, selectedAssetId: assetId, formMode });
  };


  if (!terminalOk) {
    return (
      <Box alignItems="center" justifyContent="center">
        <Text color="yellow">
          {'Trop petite (min. 100×24).'}
        </Text>
      </Box>
    );
  }

  switch (state.view) {
    case 'list':
      return <AssetTable onNavigate={onNavigate} />;
    case 'detail':
      return <AssetDetail assetId={state.selectedAssetId!} onNavigate={onNavigate} />;
    case 'form':
      return (
        <AssetForm
          mode={state.formMode ?? 'add'}
          assetId={state.selectedAssetId}
          onNavigate={onNavigate}
        />
      );
    case 'history':
      return <AssetHistory assetId={state.selectedAssetId!} onNavigate={onNavigate} />;
    case 'dashboard':
      return <ComplianceDashboard onNavigate={onNavigate} />;
    case 'owners':
      return <OwnerManager onNavigate={onNavigate} />;
  }
}
