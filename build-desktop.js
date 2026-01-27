const os = require('os')
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

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
    const expectedFiles = ['dist/index-cv.html', 'dist/index.html']

    for (const file of expectedFiles) {
        if (!fs.existsSync(file)) {
            console.error(`Error: ${file} not found after build`)
            process.exit(1)
        }
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

    if (!fs.existsSync(frontendDist)) {
        console.error(
            `Error: Frontend dist path ${frontendDist} does not exist`
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
