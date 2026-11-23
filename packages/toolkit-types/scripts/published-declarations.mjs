// npm runs "prepare" (tsc) when it packs or publishes, after the build: tsc writes dist/*.d.ts again without the
// extensions an ES module needs under node16 / nodenext, and the host saw none of the re-exported types. This puts back
// what the build's last step writes (#5578).
import { addDeclarationExtensions, copyCommonJsDeclarations } from '../../toolkit-ui/scripts/declarations.mjs';

addDeclarationExtensions('dist', 'dist/cjs');
copyCommonJsDeclarations('dist', 'dist/cjs');
