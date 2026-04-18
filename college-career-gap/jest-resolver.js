/**
 * Custom Jest resolver that forces firebase-admin (and firebase-functions)
 * imports to resolve from the project root node_modules instead of
 * src/functions/node_modules.  This ensures jest.mock() registrations—which
 * use the root-resolved path—actually intercept the require() calls inside
 * src/functions/index.js.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path');

module.exports = (request, options) => {
  if (request.startsWith('firebase-admin') || request.startsWith('firebase-functions')) {
    // Always resolve from the project root, never from a subdirectory
    const rootNodeModules = path.resolve(options.rootDir, 'node_modules');
    return options.defaultResolver(request, {
      ...options,
      paths: [rootNodeModules],
    });
  }
  return options.defaultResolver(request, options);
};
