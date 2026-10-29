// The version of the reader. Bump it on every release: the service worker keeps the
// app files in a cache named after it, and a new value makes it fetch them again.
// A classic script, not a module: sw.js loads it with importScripts().
self.APP_VERSION = '5.0.1';
