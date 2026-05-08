const { createSite } = require('./nginx.js');
createSite('delim.app', 'nuxt', '3001', '/var/www/delim.app/public', null, null)
  .then(res => console.log(res))
  .catch(err => console.error(err));
