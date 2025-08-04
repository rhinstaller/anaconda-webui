#!/usr/bin/env node

/*
 * Auto-generate documentation for Anaconda storage scenarios
 * This script extracts @description from JSDoc comments in scenario files
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock cockpit dependency for Node.js environment
global.cockpit = {
    gettext: (text) => text,
    locale: () => "en"
};

// eslint-disable-next-line no-console
const log = console.log;
// eslint-disable-next-line no-console
const warn = console.warn;

// Utility function to find all index.js files in a directory recursively
function findIndexFiles (dir) {
    const files = [];

    function traverse (currentDir) {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);

            if (entry.isDirectory()) {
                traverse(fullPath);
            } else if (entry.name === "index.js") {
                files.push(fullPath);
            }
        }
    }

    traverse(dir);
    return files;
}

// Global mocking system - create mocked versions of all files once
class MockingSystem {
    constructor () {
        this.mockedFiles = new Map();
        this.tempDir = path.join(__dirname, ".temp-mocks");
    }

    async initialize () {
        // Create temp directory
        if (fs.existsSync(this.tempDir)) {
            fs.rmSync(this.tempDir, { recursive: true });
        }
        fs.mkdirSync(this.tempDir, { recursive: true });

        // Mock all index.js files that import JSX
        await this.mockAllIndexFiles();

        // Mock steps.js
        await this.mockStepsFile();
    }

    cleanup () {
        if (fs.existsSync(this.tempDir)) {
            fs.rmSync(this.tempDir, { recursive: true });
        }
    }

    async mockAllIndexFiles () {
        // Find all index.js files in component directories
        const srcDir = path.resolve(__dirname, "../src/components");
        const indexFiles = findIndexFiles(srcDir);

        for (const filePath of indexFiles) {
            await this.createMockedFile(filePath);
        }
    }

    async mockScenarioFiles (scenarioFiles) {
        // Mock scenario files that aren't already mocked
        for (const filePath of scenarioFiles) {
            if (!this.mockedFiles.has(filePath)) {
                await this.createMockedFile(filePath);
            }
        }
    }

    async createMockedFile (originalPath) {
        let content = fs.readFileSync(originalPath, "utf8");

        // Apply comprehensive mocking
        content = this.applyMocking(content);

        // Create relative path for temp file
        const relativePath = path.relative(path.resolve(__dirname, "../src"), originalPath);
        const mockedPath = path.join(this.tempDir, relativePath);

        // Ensure directory exists
        fs.mkdirSync(path.dirname(mockedPath), { recursive: true });

        // Write mocked file
        fs.writeFileSync(mockedPath, content);

        // Store mapping
        this.mockedFiles.set(originalPath, mockedPath);

        return mockedPath;
    }

    async mockStepsFile () {
        const stepsPath = path.resolve(__dirname, "../src/components/steps.js");
        let content = fs.readFileSync(stepsPath, "utf8");

        // Apply basic mocking for steps.js
        content = this.applyMocking(content);

        // Update imports to point to mocked files
        content = content.replace(
            /import\s+\{\s*Page\s+as\s+([^}]+)\s*\}\s+from\s+["']([^"']+)["'];?/g,
            (match, pageName, importPath) => {
                // Convert relative import to absolute
                const absoluteImportPath = path.resolve(path.dirname(stepsPath), importPath);
                const mockedPath = this.mockedFiles.get(absoluteImportPath);
                const relativeToTemp = path.relative(path.dirname(path.join(this.tempDir, "components/steps.js")), mockedPath);
                return `import { Page as ${pageName} } from "./${relativeToTemp}";`;
            }
        );

        // Write mocked steps.js
        const mockedStepsPath = path.join(this.tempDir, "components/steps.js");
        fs.mkdirSync(path.dirname(mockedStepsPath), { recursive: true });
        fs.writeFileSync(mockedStepsPath, content);

        return mockedStepsPath;
    }

    applyMocking (content) {
        // Mock cockpit import
        content = content.replace(
            /import\s+cockpit\s+from\s+["']cockpit["'];?/g,
            "const cockpit = { gettext: (text) => text, format: (str, ...args) => str };"
        );

        // Mock debug import
        content = content.replace(
            /import\s+\{\s*debug\s*\}\s+from\s+["'][^"']*["'];?/g,
            "const debug = () => {};"
        );

        // Mock all JSX file imports with comprehensive function mocks
        content = content.replace(
            /import\s+\{\s*([^}]+)\s*\}\s+from\s+["'][^"']*\.jsx["'];?/g,
            (match, componentNames) => {
                const names = componentNames.split(",").map(name => name.trim())
                        .filter(name => name.length > 0);
                const mocks = names.map(name => {
                    // Create different types of mocks based on naming patterns
                    if (name.startsWith("use") || name.startsWith("get")) {
                        return `const ${name} = () => null;`;
                    } else {
                        return `const ${name} = {};`;
                    }
                }).join("\n");
                return mocks;
            }
        );

        return content;
    }

    async importMockedSteps () {
        const mockedStepsPath = path.join(this.tempDir, "components/steps.js");
        const moduleUrl = "file://" + mockedStepsPath;
        const module = await import(moduleUrl);
        return module.getSteps;
    }

    async importMockedScenario (originalPath) {
        const mockedPath = this.mockedFiles.get(originalPath);
        if (!mockedPath) {
            throw new Error(`No mocked version found for ${originalPath}`);
        }

        const moduleUrl = "file://" + mockedPath;
        const module = await import(moduleUrl);
        return module;
    }
}

// Get step order from the getSteps function
async function getOrderedSteps (mockingSystem) {
    const getSteps = await mockingSystem.importMockedSteps();

    // Call getSteps with mock arguments
    const steps = getSteps({}, {}, {});

    return steps
            .flat()
            .filter(step => step.id && step._description);
}

// Extract scenario information using the mocking system
async function extractScenarioInfo (indexPath, mockingSystem) {
    if (!fs.existsSync(indexPath)) {
        return null;
    }

    const content = fs.readFileSync(indexPath, "utf8");

    // Extract JSDoc comments
    const jsdocMatch = content.match(/\/\*\*\s*([\s\S]*?)\*\//);

    let description = null;
    if (jsdocMatch) {
        const jsdocContent = jsdocMatch[1];

        // Extract description
        const descMatch = jsdocContent.match(/@description\s+(.*?)(?=@|$)/s);
        if (descMatch) {
            description = descMatch[1]
                    .replace(/\s*\*\s*/g, " ")
                    .replace(/\s+/g, " ")
                    .trim();
        }
    }

    // Use the pre-mocked file from the mocking system
    const module = await mockingSystem.importMockedScenario(indexPath);

    if (!module.scenario) {
        warn(`No scenario export found in ${indexPath}`);
        return null;
    }

    return {
        description,
        ...module.scenario,
    };
}

// Extract page information using the mocking system
async function extractPageInfo (filePath, mockingSystem) {
    // Use the pre-mocked file from the mocking system
    const module = await mockingSystem.importMockedScenario(filePath);

    // Check if this file has a Page class, and if so extract page info
    if (module.Page) {
        // Create instance to get properties (pass dummy args for constructors that expect them)
        const pageInstance = new module.Page(false, "erase-all");

        const result = {
            description: pageInstance._description || null,
            ...pageInstance,
        };

        return result;
    }

    return null; // No page definition in this file
}

// Generate dynamic flow overview from page data
function generateFlowOverview (orderedSteps) {
    let overview = "";

    orderedSteps.forEach((step, index) => {
        const stepNumber = index + 1;
        overview += `${stepNumber}. **${!step.isFinal ? step.label : "Installation progress"}**\n`;
    });

    return overview;
}

// Generate the main documentation content
function generateStepsRst (orderedSteps, scenarios) {
    const flowOverview = generateFlowOverview(orderedSteps);

    // Generate storage scenarios section
    let scenariosSection = `
Storage Partitioning Scenarios
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The Web UI installer provides several storage partitioning scenarios to accommodate different installation needs:

.. figure:: images/storage-scenario-overview.png
   :width: 500px
   :alt: Storage scenarios overview interface

`;

    scenarios.forEach((scenario, index) => {
        scenariosSection += `**${scenario.getLabel() || scenario.docsLabel}**\n\n`;
        if (scenario.description) {
            scenariosSection += `${scenario.description}\n`;
        }

        // Check if individual scenario image exists and include it
        const scenarioImagePath = path.join(__dirname, "images", `storage-scenario-${scenario.id}.png`);
        if (fs.existsSync(scenarioImagePath)) {
            scenariosSection += `
.. figure:: images/storage-scenario-${scenario.id}.png
   :width: 500px
   :alt: ${scenario.getLabel() || scenario.docsLabel} scenario interface
`;
        }

        // Add spacing between scenarios except for the last one
        if (index < scenarios.length - 1) {
            scenariosSection += "\n";
        }
    });

    const rstContent = `
Installation Flow Overview
==========================

This document describes the step-by-step process for installing the system using the Web UI.

${flowOverview}
Detailed Step Descriptions
=============================

${orderedSteps.map((step, index) => {
        const stepNumber = index + 1;
        const stepTitle = `${stepNumber}. ${!step.isFinal ? step.label : "Installation progress"}`;
        let stepContent = stepTitle + "\n" + "-".repeat(stepTitle.length) + `\n\n${step.description || "No description available."}\n`;

        // Add scenarios subsection for the Installation method step
        if (step.id === "anaconda-screen-method") {
            stepContent += `\n${scenariosSection}`;
        }

        return stepContent;
    }).join("\n")}
`;

    return rstContent;
}

// Main function to generate documentation
async function generateDocs () {
    const mockingSystem = new MockingSystem();

    try {
        log("Starting documentation generation...");
        log("Initializing mocking system...");

        // Initialize the global mocking system
        await mockingSystem.initialize();

        log("Getting ordered steps...");
        // Get ordered steps from getSteps()
        const orderedSteps = await getOrderedSteps(mockingSystem);

        log("Processing scenarios and pages...");
        // Get all scenarios and pages
        const scenariosDir = path.join(__dirname, "..", "src", "components", "storage", "scenarios");
        const scenarioIndexFiles = findIndexFiles(scenariosDir);

        // Filter out the root scenarios/index.js file - only include files in subdirectories
        const scenarioFiles = scenarioIndexFiles.filter(filePath => {
            const relativePath = path.relative(scenariosDir, filePath);
            return relativePath !== "index.js"; // Exclude the root index.js
        });

        // Mock scenario files before trying to import them
        await mockingSystem.mockScenarioFiles(scenarioFiles);

        const scenarioPromises = scenarioFiles.map(filePath => extractScenarioInfo(filePath, mockingSystem));
        const scenarios = await Promise.all(scenarioPromises);

        // Find page files using findIndexFiles and filter out scenarios directory
        const componentsDir = path.resolve(__dirname, "../src/components");
        const allIndexFiles = findIndexFiles(componentsDir);

        const pageFiles = allIndexFiles
                .filter(filePath => !filePath.startsWith(scenariosDir));

        // Mock page files before trying to import them
        await mockingSystem.mockScenarioFiles(pageFiles);

        const pagePromises = pageFiles.map(filePath => extractPageInfo(filePath, mockingSystem));
        const pages = await Promise.all(pagePromises);

        // Match pages with steps by ID
        const stepsWithPageData = orderedSteps.map(step => {
            const matchingPage = pages.find(page => page.id === step.id);
            return {
                ...step,
                description: matchingPage?.description,
            };
        });

        log("Generating documentation...");
        // Generate the documentation
        const stepsRst = generateStepsRst(stepsWithPageData, scenarios);

        // Write the documentation
        const outputPath = path.join(__dirname, "installation-steps.rst");
        fs.writeFileSync(outputPath, stepsRst);

        log("Documentation generation completed!");
    } finally {
        // Always cleanup temp files
        mockingSystem.cleanup();
    }
}

// Run the documentation generation
generateDocs();
