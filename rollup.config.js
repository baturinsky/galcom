import sourcemaps from 'rollup-plugin-sourcemaps';
import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import typescript from "rollup-plugin-typescript2";
import { terser } from "rollup-plugin-terser";

const production = !process.env.ROLLUP_WATCH;

export default [
  {
    input: "src/index.ts",
    output: {
      sourcemap: false,
      format: "iife",
      name: "app",
      file: "public/bundle.js"
    },
    plugins: [

      sourcemaps(),

      resolve({ browser: true, preferBuiltins: false }),

      typescript({
        cacheRoot: `${require("temp-dir")}/.rpt2_cache`,
        tsconfig: "tsconfig.json"
      }),

      commonjs(),

      production && terser(),

    ],
    watch: {
      clearScreen: false
    }
  }
];
