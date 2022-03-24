#!/usr/bin/env node

const { program } = require('commander');
const prompts = require('prompts');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {exec} = require('child_process');

program
  .option('--all')
  .option('--default')
  .option('--latest')
  .option('--version <version>');

program.parse();

const options = program.opts();



const onCancel = prompt => {
    console.log('Aborted by user!');
    process.exit(1);
};

function hexaExec (_command) {
    return new Promise(function(resolve, reject) {
        console.log('execute ' + _command);
        exec(_command, function(err, stdout) {
            if (err) return reject(err);
            resolve(stdout);
        });
    });
}

async function initProject (_newProjectName) {
    console.log('initialize project ' + _newProjectName);

    let tmpDir;
    let newDir;
    try {
        const version = options.latest || !options.version ? 'HEAD' : options.version;
        // mkdir /tmp/mytemporaryfolder
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hexapinod'));
        // cd /tmp/mytemporaryfolder
        // git clone https://github.com/cecric/hexapinod.git
        const responseExec1 = await hexaExec('cd ' + tmpDir + '; git clone https://github.com/cecric/hexapinod.git;');
        console.log(responseExec1);
        newDir = path.resolve(path.join('./', _newProjectName));
        fs.mkdirSync(newDir, {recursive: true});
        // cd ./hexapinod
        // git archive --format=tar.gz v1.1.0 > hexapinod-1.1.0.tar.gz
        // tar -xzf ./hexapinod-1.1.0.tar.gz -C /my/project/folder
        const responseExec2 = await hexaExec('cd ' + tmpDir + '/hexapinod ; git archive --format=tar.gz ' + version + ' > hexapinod-1.1.0.tar.gz ; tar -xzf ./hexapinod-1.1.0.tar.gz -C ' + newDir);
        console.log(responseExec2);
    }
    catch (e) {
        console.log(e);
        // handle error
    } finally {
        try {
            // rm -rf /tmp/mytemporaryfolder
            if (tmpDir) {
                fs.rmSync(tmpDir, { recursive: true });
            }
        }
        catch (e) {
            console.error(`An error has occurred while removing the temp folder at ${tmpDir}. Please remove it manually. Error: ${e}`);
            process.exit(1);
        }
    }
    return newDir;
}


async function initialize () {
    const limit = options.first ? 1 : undefined;
    // console.log(program.args[0].split(options.separator, limit));
    let projectName = 'my-hexapinod-project';
    if (!options.default) {
        const response = await prompts({
            type: 'text',
            name: 'value',
            message: 'Name of the project?',
            initial: 'my-hexapinod-project',
            validate: value => !!value
          }, {onCancel});
        projectName = response['value'];
    }
    const projectPath = await initProject(projectName);
    let rawPackageData = fs.readFileSync(projectPath + '/package.json');
    let packageData = JSON.parse(rawPackageData);
    packageData['name'] = projectName;
    if (!options.default) {
        const responseParameters = await prompts([{
            type: 'text',
            name: 'version',
            message: 'Numero version?',
            initial: '1.0.0',
            validate: value => !!value
        },{
            type: 'text',
            name: 'description',
            message: 'Description?',
            initial: 'This is an hexapinod sample project.',
            validate: value => !!value
        }], {onCancel});
        packageData['version'] = responseParameters['version'];
        packageData['description'] = responseParameters['description'];
    }
    if (!options.all) {
        // Test : 
        // chai, chai-http, mocha, @types/mocha, @types/chai
        // jest
        packageData = await checkModuleActivation ('Test', {
            'chai-mocha': {
                'title': 'Chai/Mocha',
                'selected': true,
                'files_to_remove': ['src/application/tests/index.test.ts','src/application/tests/example.test.ts'],
                'packages_to_remove': ['chai', 'chai-http', 'mocha', '@types/mocha', '@types/chai']
            },
            'jest': {
                'title': 'Jest',
                'files_to_remove': [],
                'packages_to_remove': []
            }
        }, packageData, projectPath);
        // API doc : 
        // express-jsdoc-swagger
        // apidoc
        // typedoc
        packageData = await checkModuleActivation ('API Documentation', {
            'jsdoc-swagger': {
                'title': 'JSDoc Swagger',
                'selected': true,
                'files_to_remove': ['config/application/api/openapi.json'],
                'packages_to_remove': ['express-jsdoc-swagger']
            },
            'apidoc': {
                'title': 'API Doc JS',
                'selected': true,
                'files_to_remove': [],
                'packages_to_remove': ['apidoc'],
                'scripts': {
                    'apidocs': 'echo \'disabled\';'
                }
            },
            'typedoc': {
                'title': 'TypeDoc',
                'selected': true,
                'files_to_remove': [],
                'packages_to_remove': ['typedoc', 'typedoc-plugin-merge-modules', 'typedoc-plugin-rename-defaults'],
                'scripts': {
                    'docs': 'echo \'disabled\';'
                }
            }
        }, packageData, projectPath);
        // Database 
        // MySQL, PostgreSQL
        packageData = await checkModuleActivation ('Database', {
            'mysql': {
                'title': 'MySQL',
                'selected': true,
                'files_to_remove': [],
                'packages_to_remove': ['mysql']
            },
            'postgresql': {
                'title': 'PostgreSQL',
                'files_to_remove': [],
                'packages_to_remove': []
            }
        }, packageData, projectPath);
        // ORM
        // Hexapinod, TypeORM
        packageData = await checkModuleActivation ('ORM', {
            'hexapinod': {
                'title': 'Hexapinod',
                'selected': true,
                'files_to_remove': [],
                'packages_to_remove': []
            },
            'typeorm': {
                'title': 'TypeORM',
                'files_to_remove': ['config/dependencies/typeorm.json', 'src/application/cli/typeorm.command.ts', 'src/dependencies/typeorm-wrapper'],
                'packages_to_remove': ['typeorm']
            }
        }, packageData, projectPath);
        // Socket IO
        // socket.io
        // With Redis
        // @socket.io/redis-adapter, redis
        // Sample ?
        // Auth Sample ?
        packageData = await checkModuleActivation ('Features', {
            'socket.io': {
                'title': 'socket.io',
                'selected': true,
                'files_to_remove': ['config/application/api/wsserver.json', 'src/application/api/wsserver.ts'],
                'packages_to_remove': ['socket.io', '@socket.io/redis-adapter']
            },
            'redis-socket.io': {
                'title': 'redis for Socket.io',
                'selected': true,
                'files_to_remove': [],
                'packages_to_remove': ['@socket.io/redis-adapter']
            },
            'redis': {
                'title': 'Redis (if not selected, will remove the socket-io redis too)',
                'selected': true,
                'files_to_remove': [],
                'packages_to_remove': ['redis', '@socket.io/redis-adapter']
            },
            'sample': {
                'title': 'Sample bundle (with auth, repositories...)',
                'selected': true,
                'files_to_remove': [
                    'src/application/api/rest/middlewares/example',
                    'src/application/api/rest/routes/example',
                    'src/core/example',
                    'src/infrastructure/repositories/example'
                ],
                'packages_to_remove': ['luxon', 'bcryptjs', 'jsonwebtoken', 'public-ip']
            }
        }, packageData, projectPath);
    }
    let data = JSON.stringify(packageData, null, 2);
    fs.rmSync(projectPath + '/package-lock.json');
    fs.writeFileSync(projectPath + '/package.json', data);
    console.log('project initialized');
}



async function checkModuleActivation (_name, _choices, _packageData,  _projectPath) {
    const selectChoices = Object.keys(_choices).map(val => {return {'title': _choices[val]['title'], 'value': val, selected: _choices[val]['selected']}});
    const response = await prompts({
        type: 'multiselect',
        name: 'value',
        message: 'Select your '+_name +' module?',
        choices: selectChoices
      }, {onCancel});
    // console.log(response);
    for (let i = 0; i < selectChoices.length; i++) {
        if(response['value'] && (
            (Array.isArray(response['value']) && response['value'].indexOf(selectChoices[i]['value']) === -1) || 
            (!Array.isArray(response['value']) && response['value'] === selectChoices[i]['value']))) {
            console.log('remove ' + selectChoices[i]['title'] + ' from project');
            if (_choices[selectChoices[i]['value']]['packages_to_remove']) {
                const dependencies = _packageData['dependencies'];
                const devDependencies = _packageData['devDependencies'];
                for (let p = 0; p < _choices[selectChoices[i]['value']]['packages_to_remove'].length; p++) {
                    if (dependencies[_choices[selectChoices[i]['value']]['packages_to_remove'][p]]) {
                        dependencies[_choices[selectChoices[i]['value']]['packages_to_remove'][p]] = undefined;
                    }
                    if (devDependencies[_choices[selectChoices[i]['value']]['packages_to_remove'][p]]) {
                        devDependencies[_choices[selectChoices[i]['value']]['packages_to_remove'][p]] = undefined;
                    }
                }
                _packageData['dependencies'] = dependencies;
                _packageData['devDependencies'] = devDependencies;
            }
            if (_choices[selectChoices[i]['value']]['files_to_remove']) {
                for (let p = 0; p < _choices[selectChoices[i]['value']]['files_to_remove'].length; p++) {
                    const filepath = _choices[selectChoices[i]['value']]['files_to_remove'][p];
                    fs.rmSync(_projectPath + '/' + filepath, { recursive: true, force: true });
                }
            }
            if (_choices[selectChoices[i]['value']]['scripts']) {
                for (let scriptName in _choices[selectChoices[i]['value']]['scripts']) {
                    if(_packageData['scripts'] && _packageData['scripts'][scriptName]) {
                        _packageData['scripts'][scriptName] = _choices[selectChoices[i]['value']]['scripts'][scriptName];
                    }
                }
            }
        }
    }
    return _packageData;
}

initialize ();