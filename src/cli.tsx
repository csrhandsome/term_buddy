process.env.NODE_ENV ??= 'production';

const React = await import('react');
const {render} = await import('ink');
const {App} = await import('./app/index.js');

render(React.createElement(App));
