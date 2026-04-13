import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { getDb } from '../context.js';
import { getComplianceReport } from '../db/queries/compliance.js';
import type { ComplianceReport } from '../types/compliance.js';
import type { NavigateFunction } from './App.js';
import { t } from '../i18n.js';

const BAR_WIDTH = 30;

function progressBar(rate: number): string {
  const filled = Math.round((rate / 100) * BAR_WIDTH);
  const empty = BAR_WIDTH - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${rate}%`;
}

function rateColor(rate: number): string {
  if (rate >= 80) return 'green';
  if (rate >= 50) return 'yellow';
  return 'red';
}


interface ComplianceDashboardProps {
  onNavigate: NavigateFunction;
}

export function ComplianceDashboard({ onNavigate }: ComplianceDashboardProps): React.ReactElement {
  const [data, setData] = useState<ComplianceReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const db = getDb();
      setData(getComplianceReport(db));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useInput((_input, key) => {
    if (key.escape) {
      onNavigate('list');
    }
  });

  if (error) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red">{t('tui_error_prefix')}{error}</Text>
        <Text color="gray">{t('tui_back_hint')}</Text>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="gray">{t('tui_loading')}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">{t('tui_dashboard_title')}</Text>
      </Box>

      <Box marginBottom={1}>
        <Text color="gray">{t('tui_dashboard_active')}</Text>
        <Text bold>{data.totalActive}</Text>
      </Box>

      {/* Progress bars */}
      <Box flexDirection="column" marginBottom={1}>
        <Box marginBottom={0}>
          <Box width={28}><Text color="gray">{t('tui_dashboard_metric_owner')}</Text></Box>
          <Text color={rateColor(data.ownerCoverageRate)}>{progressBar(data.ownerCoverageRate)}</Text>
        </Box>
        <Box marginBottom={0}>
          <Box width={28}><Text color="gray">{t('tui_dashboard_metric_class')}</Text></Box>
          <Text color={rateColor(data.classificationCoverageRate)}>{progressBar(data.classificationCoverageRate)}</Text>
        </Box>
        <Box marginBottom={0}>
          <Box width={28}><Text color="gray">{t('tui_dashboard_metric_review')}</Text></Box>
          <Text color={rateColor(data.reviewCoverageRate)}>{progressBar(data.reviewCoverageRate)}</Text>
        </Box>
        <Box marginBottom={0}>
          <Box width={28}><Text bold>{t('tui_dashboard_metric_global')}</Text></Box>
          <Text bold color={rateColor(data.globalComplianceRate)}>{progressBar(data.globalComplianceRate)}</Text>
        </Box>
      </Box>

      {/* Alerts section */}
      <Box marginBottom={1}>
        <Text color="gray">{'─'.repeat(50)}</Text>
      </Box>
      <Box marginBottom={1}>
        <Text bold>{t('tui_dashboard_alerts')}</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Box flexDirection="row" gap={2}>
          <Box width={30}>
            <Text color="gray">{t('tui_dashboard_overdue')}</Text>
          </Box>
          <Text color={data.overdueAssets > 0 ? 'red' : 'green'} bold>
            {data.overdueAssets > 0 ? `⚠  ${data.overdueAssets}` : `✓  0`}
          </Text>
        </Box>
        <Box flexDirection="row" gap={2}>
          <Box width={30}>
            <Text color="gray">{t('tui_dashboard_unowned')}</Text>
          </Box>
          <Text color={data.unownedAssets > 0 ? 'red' : 'green'} bold>
            {data.unownedAssets > 0 ? `⚠  ${data.unownedAssets}` : `✓  0`}
          </Text>
        </Box>
        <Box flexDirection="row" gap={2}>
          <Box width={30}>
            <Text color="gray">{t('tui_dashboard_unclassified')}</Text>
          </Box>
          <Text color={data.unclassifiedAssets > 0 ? 'red' : 'green'} bold>
            {data.unclassifiedAssets > 0 ? `⚠  ${data.unclassifiedAssets}` : `✓  0`}
          </Text>
        </Box>
      </Box>

      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text color="gray">{t('tui_dashboard_hint')}</Text>
      </Box>
    </Box>
  );
}
