#!/usr/bin/env node
import esbuild from "esbuild";
import copy from "esbuild-plugin-copy";
import { sassPlugin } from "esbuild-sass-plugin";
import fs from "fs";
import path from "path";

import { cockpitPoEsbuildPlugin } from "./pkg/lib/cockpit-po-plugin.js";
import { cockpitRsyncEsbuildPlugin } from "./pkg/lib/cockpit-rsync-plugin.js";
import { cleanPlugin } from "./pkg/lib/esbuild-cleanup-plugin.js";
import { cockpitCompressPlugin } from "./pkg/lib/esbuild-compress-plugin.js";

const production = process.env.NODE_ENV === "production";
const watchMode = process.env.ESBUILD_WATCH === "true" || false;
/* List of directories to use when resolving import statements */
const nodePaths = ["pkg/lib"];
const outdir = "dist";

// Obtain package name from package.json
const packageJson = JSON.parse(fs.readFileSync("package.json"));

const getTime = () => new Date().toTimeString()
        .split(" ")[0];

// similar to fs.watch(), but recursively watches all subdirectories
function watchDirs (dir, onChange) {
    const callback = (ev, dir, fname) => {
        // only listen for "change" events, as renames are noisy
        // ignore hidden files and the "4913" temporary file created by vim
        const isHidden = /^\./.test(fname);
        if (ev !== "change" || isHidden || fname === "4913") {
            return;
        }
        onChange(path.join(dir, fname));
    };
// eslint-disable-next-line promise/prefer-await-to-callbacks
    fs.watch(dir, {}, (ev, path) => callback(ev, dir, path));

    // watch all subdirectories in dir
    const d = fs.opendirSync(dir);
    let dirent;
    while ((dirent = d.readSync()) !== null) {
        if (dirent.isDirectory()) {
            watchDirs(path.join(dir, dirent.name), onChange);
        }
    }
    d.closeSync();
}

const context = await esbuild.context({
    bundle: true,
    entryPoints: ["./src/index.js"],
    external: [
        "*.woff", "*.woff2", "*.jpg",
        "@patternfly/react-core/src/components/assets/*.svg",
        "@patternfly/react-core/src/demos/assets/*svg"
    ], // Allow external font files which live in ../../static/fonts
    legalComments: "external", // Move all legal comments to a .LEGAL.txt file
    loader: {
        ".js": "jsx",
        ".py": "text",
        ".svg": "dataurl",
        ".txt": "text",
    },
    minify: production,
    nodePaths,
    outdir,
    plugins: [
        cleanPlugin(),
        // Esbuild will only copy assets that are explicitly imported and used
        // in the code. This is a problem for index.html and manifest.json which are not imported
        copy({
            assets: [
                { from: ["./images/qr-code-feedback.svg"], to: ["./qr-code-feedback.svg"] },
                { from: ["./src/manifest.json"], to: ["./manifest.json"] },
                { from: ["./src/index.html"], to: ["./index.html"] },
                { from: ["./VERSION.txt"], to: ["./VERSION.txt"] },
            ]
        }),
        sassPlugin({
            loadPaths: [...nodePaths, "node_modules"],
            quietDeps: true,
        }),
        cockpitPoEsbuildPlugin(),
        cockpitCompressPlugin(),
        cockpitRsyncEsbuildPlugin({ dest: packageJson.name }),

        {
            name: "notify-end",
            setup (build) {
                build.onEnd(() => {
                    // eslint-disable-next-line no-console
                    console.log(`${getTime()}: Build finished`);
                });
            }
        },
    ],
    sourcemap: "linked",
    target: ["es2020"],
});

try {
    await context.rebuild();
} catch (e) {
    if (!watchMode) {
        process.exit(1);
    }
    // ignore errors in watch mode
}

if (watchMode) {
    const onChange = async path => {
        // eslint-disable-next-line no-console
        console.log("change detected:", path);
        await context.cancel();
        try {
            await context.rebuild();
        } catch (e) {} // ignore in watch mode
    };

    watchDirs("src", onChange);
    // wait forever until Control-C
    await new Promise(() => {});
}

context.dispose();
