import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/** `X.web.tsx` is X on web: it shares X's story. */
const basePath = (path: string) => path.replace(/\.(web|native|ios|android)\.tsx$/, '.tsx');

/**
 * No component without a story (docs/architecture.md, Admin app). Screens are
 * exempt: they only wire hooks to a view, and the view has the stories.
 */
function componentFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return componentFiles(path);
    const isComponent =
      entry.name.endsWith('.tsx') &&
      !/\.(test|stories)\.tsx$/.test(entry.name) &&
      !basePath(entry.name).endsWith('Screen.tsx');
    return isComponent ? [path] : [];
  });
}

test.each(componentFiles(__dirname))('%s has a story', (file) => {
  expect(existsSync(basePath(file).replace(/\.tsx$/, '.stories.tsx'))).toBe(true);
});
