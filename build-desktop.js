const os = require('os')
const path = require('path')
const { execSync } = require('child_process')
const fs = require('fs')

function runCommand(command) {
    try {
        const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' })
        if (output) {
            console.log(output)
        }
    } catch (error) {
        console.error(`Error executing command: ${command}`)
        if (error.stdout) {
            console.error(`Stdout: ${error.stdout}`)
        }
        if (error.stderr) {
            console.error(`Stderr: ${error.stderr}`)
        }
        process.exit(1)
    }
}

function validateBuild() {
    // Check if any build exists in dist/
    const versions = ['v0', 'v1']
    let foundBuild = false

    for (const version of versions) {
        const versionHtml = `dist/simulatorvue/${version}/index.html`
        if (fs.existsSync(versionHtml)) {
            foundBuild = true
            console.log(`Found build for version: ${version}`)
            break
        }
    }

    // Copy cv.html to the dist root for desktop use
    if (fs.existsSync('index-cv.html')) {
        fs.copyFileSync('index-cv.html', 'dist/index-cv.html')
        console.log('Copied index-cv.html to dist/')
    }

    // Create main index.html for desktop (use v0 build)
    const v0Index = 'dist/simulatorvue/v0/index.html'
    if (fs.existsSync(v0Index)) {
        fs.copyFileSync(v0Index, 'dist/index.html')
        console.log('Copied v0 index.html to dist/')
        foundBuild = true
    }

    if (!foundBuild) {
        console.error('Error: No valid builds found in dist/ directory')
        console.error(
            'Expected: dist/simulatorvue/v0/index.html or dist/simulatorvue/v1/index.html'
        )
        process.exit(1)
    }

    console.log('Build validation successful')
}

function setupDesktopEnvironment() {
    process.env.DESKTOP_MODE = 'true'
    console.log('Desktop mode enabled')
}

function buildFrontend() {
    const platform = os.platform()
    console.log(
        `Building for ${
            platform === 'win32' ? 'Windows' : 'Unix-based system'
        }...`
    )

    runCommand('npm run build')
    validateBuild()

    if (platform === 'win32') {
        runCommand('copy dist\\index-cv.html dist\\index.html')
    } else {
        runCommand('cp dist/index-cv.html dist/index.html')
    }

    console.log('Frontend build completed successfully')
}

function checkTauriConfiguration() {
    const tauriConfigPath = 'src-tauri/tauri.conf.json'
    if (!fs.existsSync(tauriConfigPath)) {
        console.error('Error: Tauri configuration not found')
        process.exit(1)
    }

    const config = JSON.parse(fs.readFileSync(tauriConfigPath, 'utf8'))
    const frontendDist = config.build?.frontendDist

    if (!frontendDist) {
        console.error('Error: frontendDist not configured in tauri.conf.json')
        process.exit(1)
    }

    // Resolve frontendDist relative to the tauri.conf.json location
    const configDir = path.dirname(tauriConfigPath)
    const resolvedFrontendDist = path.resolve(configDir, frontendDist)

    if (!fs.existsSync(resolvedFrontendDist)) {
        console.error(
            `Error: Frontend dist path ${frontendDist} does not exist (resolved to ${resolvedFrontendDist})`
        )
        process.exit(1)
    }

    console.log(`Tauri configuration validated (frontendDist: ${frontendDist})`)
}

function main() {
    console.log('Starting CircuitVerse Desktop Build Process')

    try {
        setupDesktopEnvironment()
        buildFrontend()
        checkTauriConfiguration()

        console.log('Desktop build process completed successfully')
        console.log('Ready for Tauri build: npm run tauri build')
    } catch (error) {
        console.error('Build process failed:', error.message)
        process.exit(1)
    }
}

main()
