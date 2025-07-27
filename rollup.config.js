import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import { readFileSync } from 'fs';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));

const banner = `/**
 * ${packageJson.name} v${packageJson.version}
 * ${packageJson.description}
 * 
 * @author ${packageJson.author}
 * @license ${packageJson.license}
 * @homepage ${packageJson.homepage}
 */`;

const external = ['acorn'];

const plugins = [
  resolve({
    preferBuiltins: true,
    browser: false
  }),
  commonjs(),
  typescript({
    tsconfig: './tsconfig.build.json',
    declaration: true,
    declarationMap: true,
    outDir: 'dist'
  })
];

export default [
  // ESM build
  {
    input: 'src/index.ts',
    output: {
      file: packageJson.module,
      format: 'esm',
      banner,
      sourcemap: true
    },
    external,
    plugins
  },
  
  // CommonJS build
  {
    input: 'src/index.ts',
    output: {
      file: packageJson.main,
      format: 'cjs',
      banner,
      sourcemap: true,
      exports: 'auto'
    },
    external,
    plugins
  },
  
  // UMD build for browsers (minified)
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.umd.js',
      format: 'umd',
      name: 'Kangaroo',
      banner,
      sourcemap: true,
      globals: {
        'acorn': 'acorn'
      }
    },
    external,
    plugins: [
      ...plugins,
      terser({
        format: {
          comments: /^\/\*\*/
        }
      })
    ]
  },
  
  // UMD build for browsers (unminified) 
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.umd.development.js',
      format: 'umd',
      name: 'Kangaroo',
      banner,
      sourcemap: true,
      globals: {
        'acorn': 'acorn'
      }
    },
    external,
    plugins
  }
];