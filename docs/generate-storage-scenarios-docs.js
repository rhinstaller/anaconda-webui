#!/usr/bin/env node

/*
 * Auto-generate documentation for Anaconda storage scenarios
 * This script extracts @description from JSDoc comments in scenario files
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Extract scenario information from JSDoc comments only
function extractScenarioInfo (filePath) {
    try {
        const content = fs.readFileSync(filePath, "utf8");

        // Extract JSDoc metadata
        const jsdocMatch = content.match(/\/\*\*\s*([\s\S]*?)\*\//);
        if (!jsdocMatch) {
            return null;
        }

        const jsdocContent = jsdocMatch[1];
        const descMatch = jsdocContent.match(/@description\s+(.*?)(?=@|$)/s);
        if (!descMatch) {
            return null;
        }

        const detailedDescription = descMatch[1]
                .replace(/\s*\*\s*/g, " ")
                .replace(/\s+/g, " ")
                .trim();

        // Extract scenario ID from the export statement
        const exportMatch = content.match(/export const scenario = \{[\s\S]*?id:\s*"([^"]+)"/);
        if (!exportMatch) {
            return null;
        }

        return {
            description: detailedDescription,
            id: exportMatch[1],
        };
    } catch (error) {
        return null;
    }
}

// Generate reStructuredText documentation
function generateRstDocumentation (scenarios) {
    let rst = `Storage Partitioning Scenarios
==============================

This document describes the available storage partitioning scenarios in
Anaconda Web UI. These options are designed to accommodate a variety of
installation needs, from clean installs to advanced custom layouts.

.. figure:: images/storage-scenario-overview.png
   :width: 600px
   :alt: Storage partitioning scenarios interface

Note: This documentation is auto-generated from the source code.

`;

    scenarios.forEach(scenario => {
        if (!scenario) return;

        // Convert kebab-case ID to readable title
        const title = scenario.id
                .split("-")
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ");

        rst += `
.. _${scenario.id}:

${title}
${"-".repeat(title.length)}

`;

        // Check if individual scenario image exists and include it
        const scenarioImagePath = path.join(__dirname, "images", `storage-scenario-${scenario.id}.png`);
        if (fs.existsSync(scenarioImagePath)) {
            rst += `.. figure:: images/storage-scenario-${scenario.id}.png
   :width: 500px
   :alt: ${title} scenario interface

`;
        }

        rst += `${scenario.description}

`;
    });

    return rst;
}

function findIndexFiles() {
    const gitGrepOutput = execSync('find src/components/storage/scenarios/ -name "index.js"', {
        encoding: 'utf8',
        cwd: path.join(__dirname, '..')
    });

    return gitGrepOutput
        .trim()
        .split('\n')
        .filter(file => file.length > 0)
        .map(file => path.join(__dirname, '..', file));
}


// Main function
function main () {
    const scenarioFiles = findIndexFiles();
    const scenarios = scenarioFiles
            .map(extractScenarioInfo)
            .filter(Boolean)
            .sort((a, b) => a.id.localeCompare(b.id));

    // Generate documentation
    const rstContent = generateRstDocumentation(scenarios);
    const rstFile = path.join(__dirname, "storage-scenarios.rst");
    fs.writeFileSync(rstFile, rstContent);
}

main();

export { extractScenarioInfo, generateRstDocumentation };
