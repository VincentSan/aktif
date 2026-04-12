import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { getDb } from '../context.js';
import {
  listTags,
  insertTag,
  updateTag,
  deleteTag,
  getTagByName,
} from '../db/queries/tags.js';
import type { Tag } from '../types/tag.js';
import { col } from './shared/col.js';
import type { NavigateFunction } from './App.js';
import { t } from '../i18n.js';

type TagManagerView =
  | { view: 'list' }
  | { view: 'add-form' }
  | { view: 'edit'; tagId: string; oldName: string }
  | { view: 'delete-confirm'; tagId: string; tagName: string };

interface TagManagerProps {
  onNavigate: NavigateFunction;
}

function renderTagForm(opts: {
  title: string;
  titleColor: string;
  value: string;
  onChange: (v: string) => void;
  error: string | null;
  btnLabel: string;
}): React.ReactElement {
  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color={opts.titleColor as Parameters<typeof Text>[0]['color']}>{opts.title}</Text>
      {opts.error && <Text color="red">⚠ {opts.error}</Text>}
      <Box marginTop={1} flexDirection="column">
        <Box>
          <Text color="cyan">{t('tui_tag_label_name').padEnd(10)}</Text>
          <TextInput value={opts.value} onChange={opts.onChange} focus={true} placeholder={t('tui_tag_placeholder')} />
        </Box>
        <Box marginTop={1}>
          <Text color="black" backgroundColor="cyan" bold>{opts.btnLabel}</Text>
          <Text color="gray">{t('tui_tag_cancel')}</Text>
        </Box>
      </Box>
      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text color="gray">{t('tui_tag_form_hint')}</Text>
      </Box>
    </Box>
  );
}

export function TagManager({ onNavigate }: TagManagerProps): React.ReactElement {
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [state, setState] = useState<TagManagerView>({ view: 'list' });
  const [message, setMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [filterFocused, setFilterFocused] = useState(false);
  const [addValue, setAddValue] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const reload = () => {
    try {
      setTags(listTags(getDb()));
    } catch {
      setTags([]);
    }
  };

  useEffect(() => { reload(); }, []);

  const filtered = tags.filter((tag) => !filter || tag.name.includes(filter.toLowerCase()));

  useEffect(() => { setSelectedIndex(0); }, [filter]);

  const clampedIndex = filtered.length === 0 ? 0 : Math.min(selectedIndex, filtered.length - 1);

  useInput((input, key) => {
    if (state.view !== 'list') return;

    if (key.tab) { setFilterFocused((prev) => !prev); return; }

    if (filterFocused) {
      if (key.escape) { setFilter(''); setFilterFocused(false); }
      else if (key.return) { setFilterFocused(false); }
      return;
    }

    if (key.escape) { onNavigate('list'); return; }
    if (key.upArrow || input === 'k') { setSelectedIndex((i) => Math.max(0, i - 1)); return; }
    if (key.downArrow || input === 'j') { setSelectedIndex((i) => Math.min(filtered.length - 1, i + 1)); return; }

    if (input === 'n') {
      setAddValue(''); setAddError(null);
      setState({ view: 'add-form' }); return;
    }
    if (input === 'e' && filtered.length > 0) {
      const tag = filtered[clampedIndex];
      setEditValue(tag.name); setEditError(null);
      setState({ view: 'edit', tagId: tag.id, oldName: tag.name }); return;
    }
    if (input === 'd' && filtered.length > 0) {
      const tag = filtered[clampedIndex];
      setState({ view: 'delete-confirm', tagId: tag.id, tagName: tag.name });
    }
  });

  useInput((input, key) => {
    if (state.view !== 'add-form') return;
    if (key.escape) { setState({ view: 'list' }); setAddError(null); return; }
    if (key.return) { handleAddSubmit(); }
    void input;
  });

  function handleAddSubmit() {
    if (!addValue.trim()) { setAddError(t('tui_tag_err_name_req')); return; }
    const existing = getTagByName(getDb(), addValue);
    if (existing) { setAddError(t('tui_tag_err_duplicate')); return; }
    const created = insertTag(getDb(), addValue);
    setMessage(`${t('tui_tag_created')}${created.name}${t('tui_tag_created_end')}`);
    setState({ view: 'list' });
    reload();
  }

  useInput((input, key) => {
    if (state.view !== 'edit') return;
    if (key.escape) { setState({ view: 'list' }); setEditError(null); return; }
    if (key.return) { handleEditSubmit(); }
    void input;
  });

  function handleEditSubmit() {
    if (state.view !== 'edit') return;
    if (!editValue.trim()) { setEditError(t('tui_tag_err_name_req')); return; }
    const existing = getTagByName(getDb(), editValue);
    if (existing && existing.id !== state.tagId) { setEditError(t('tui_tag_err_duplicate')); return; }
    const updated = updateTag(getDb(), state.tagId, editValue);
    if (!updated) { setEditError(t('tui_tag_err_update')); return; }
    setMessage(`${t('tui_tag_updated_msg')}${state.oldName}${t('tui_tag_updated_msg_mid')}${updated.name}${t('tui_tag_updated_msg_end')}`);
    setState({ view: 'list' });
    reload();
  }

  useInput((input, key) => {
    if (state.view !== 'delete-confirm') return;
    if (key.escape || input === 'n') { setState({ view: 'list' }); return; }
    if (input === 'o' || input === 'y') {
      deleteTag(getDb(), state.tagId);
      setMessage(`${t('tui_tag_deleted_msg')}${state.tagName}${t('tui_tag_deleted_msg_end')}`);
      setState({ view: 'list' });
      reload();
    }
  });

  if (state.view === 'add-form') {
    return renderTagForm({
      title: t('tui_tag_add_title'),
      titleColor: 'green',
      value: addValue,
      onChange: (v) => { setAddValue(v); setAddError(null); },
      error: addError,
      btnLabel: t('tui_tag_btn_create'),
    });
  }

  if (state.view === 'edit') {
    return renderTagForm({
      title: t('tui_tag_edit_title'),
      titleColor: 'blue',
      value: editValue,
      onChange: (v) => { setEditValue(v); setEditError(null); },
      error: editError,
      btnLabel: t('tui_tag_btn_save'),
    });
  }

  if (state.view === 'delete-confirm') {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text bold color="yellow">
          {t('tui_tag_delete_confirm')}{state.tagName}{t('tui_tag_delete_confirm_end')}
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color="blue">{t('tui_tags_title')}</Text>

      <Box marginTop={1} marginBottom={1}>
        <Text color={filterFocused ? 'cyan' : 'white'}>{t('tui_filter_label')}</Text>
        <TextInput value={filter} onChange={setFilter} focus={filterFocused} placeholder={t('tui_tag_filter_placeholder')} />
        <Text color={filterFocused ? 'cyan' : 'white'}>]</Text>
        {!filterFocused && <Text color="gray">{t('tui_filter_hint')}</Text>}
      </Box>

      {message && <Text color="green">{message}</Text>}

      <Box>
        <Text bold color="blue">
          {'  '}
          {col(t('tui_col_id'), 36)}
          {'  '}
          {t('tui_col_name')}
        </Text>
      </Box>
      {filtered.length === 0 && <Text color="gray">{t('tui_no_tag')}</Text>}
      {filtered.map((tag, index) => {
        const isSelected = index === clampedIndex && !filterFocused;
        const prefix = isSelected ? '> ' : '  ';
        return (
          <Box key={tag.id}>
            <Text bold={isSelected} inverse={isSelected}>
              {prefix}{col(tag.id, 36)}{'  '}{tag.name}
            </Text>
          </Box>
        );
      })}
      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text color="gray">{t('tui_tag_list_hint')}</Text>
      </Box>
    </Box>
  );
}
