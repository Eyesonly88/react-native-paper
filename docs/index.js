/* @flow */

import path from 'path';
import fs from 'fs';
import del from 'del';
import { parse } from 'react-docgen';

const pages = path.join(__dirname, 'pages');

del.sync(pages);
fs.mkdirSync(pages);

const components = fs.readFileSync(path.join(__dirname, '../src/index.js'))
  .toString()
  .split('\n')
  .map(line => line.split(' ').pop().replace(/('|;)/g, ''))
  .filter(line => line.startsWith('./components/'))
  .map(line => {
    const file = require.resolve(path.join(__dirname, '../src', line));
    if (file.endsWith('/index.js')) {
      const matches = fs.readFileSync(file).toString().match(/export \{ default as default \} from .+/);
      if (matches && matches.length) {
        const name = matches[0].split(' ').pop().replace(/('|;)/g, '');
        return require.resolve(path.join(__dirname, '../src', line, name));
      }
    }
    return file;
  });

const items = [];
const index = [];

components.forEach(comp => {
  const componentName = comp.split('/').pop().split('.')[0];
  try {
    const componentInfo = parse(fs.readFileSync(comp).toString());
    items.push({ name: componentName, info: componentInfo });
    index.push(componentName);
  } catch (e) {
    console.log(`${componentName}: ${e.message}`);
  }
});

index.sort();
items.forEach(it => {
  fs.writeFileSync(path.join(pages, `${it.name.toLowerCase()}.js`), `
    import React from 'react';
    import Page from '../templates/Page';
    import ComponentDocs from '../templates/ComponentDocs';
    export default function ${it.name}Doc(props) {
      return (
        <Page {...props} pages={${JSON.stringify(index)}}>
          <ComponentDocs name='${it.name}' info={${JSON.stringify(it.info)}} />
        </Page>
      );
    }
  `);
});

fs.writeFileSync(path.join(pages, 'index.js'), `
  import React from 'react';
  import Home from '../templates/Home';
  import Page from '../templates/Page';
  export default (props) => (
    <Page {...props} pages={${JSON.stringify(index)}}>
      <Home />
    </Page>
  );
`);