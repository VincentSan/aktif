import { resolveConfig } from './config.js';
import { createConnection } from './db/connection.js';
import { runMigrations } from './db/migrate.js';
import { setContext } from './context.js';
import { render } from 'ink';
import React from 'react';
import { App } from './components/App.js';

const config = resolveConfig();
const { db, sqlite } = createConnection(config.db);
runMigrations(sqlite);
setContext(db, config);
process.stdout.write('\x1b[3J\x1b[2J\x1b[H');
render(React.createElement(App, null));
