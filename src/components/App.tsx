import React, { useState } from 'react';
import { Text } from 'ink';
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

export function App(): React.ReactElement {
  const [state, setState] = useState<AppState>({ view: 'list' });

  const onNavigate: NavigateFunction = (view, assetId?, formMode?) => {
    setState({ view, selectedAssetId: assetId, formMode });
  };

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
