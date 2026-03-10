#!/usr/bin/env node

/*
 * Copy pixel-test reference screenshots from test/reference/ to docs/images/
 * so that the documentation builds when test/reference is not checked out
 * (e.g. when anaconda-webui is used as a submodule).
 *
 * The main doc (installation-steps.rst) is static and uses .. include:: to pull
 * in content from docs/pages/<step>/index.rst. Run this script after updating
 * reference images or when building in an environment without the test/reference
 * submodule.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// eslint-disable-next-line no-console
const log = console.log;
// eslint-disable-next-line no-console
const warn = console.warn;

const STEP_REFERENCE_IMAGES = {
    "anaconda-screen-language": "TestLanguage-testLanguageSwitching-language-step-basic-pixels.png",
    "anaconda-screen-software-selection": "TestPayloadDNF-testEnvironmentPackages-software-selection-pixels.png",
    "anaconda-screen-method": "TestStorageBasic-testLocalStandardDisks-storage-step-basic-pixels.png",
    "anaconda-screen-storage-configuration": "TestStorageBasic-testLocalStandardDisks-storage-step-basic-pixels.png",
    "anaconda-screen-accounts": "TestUsers-testBasic-users-step-basic-pixels.png",
    "anaconda-screen-review": "TestStorageMountPoints-testMultipleDisks-review-multiple-disks-pixels.png",
    "anaconda-screen-progress": "TestInstallationProgress-testBasic-installation-progress-complete-pixels.png",
};

const REFERENCE_IMAGES_DIR = path.join(__dirname, "..", "test", "reference");
const DOC_IMAGES_DIR = path.join(__dirname, "images");

function copyReferenceImages () {
    log("Copying reference screenshots to docs/images/...");
    fs.mkdirSync(DOC_IMAGES_DIR, { recursive: true });

    let copied = 0;
    for (const [stepId, filename] of Object.entries(STEP_REFERENCE_IMAGES)) {
        const srcPath = path.join(REFERENCE_IMAGES_DIR, filename);
        if (!fs.existsSync(srcPath)) {
            warn(`Skip ${filename} (not found in test/reference)`);
            continue;
        }
        const shortId = stepId.replace(/^anaconda-screen-/, "");
        const destPath = path.join(DOC_IMAGES_DIR, `step-${shortId}.png`);
        try {
            fs.copyFileSync(srcPath, destPath);
            copied++;
        } catch (err) {
            warn(`Could not copy ${filename}: ${err.message}`);
        }
    }
    log(`Copied ${copied} image(s) to ${DOC_IMAGES_DIR}`);
}

copyReferenceImages();
