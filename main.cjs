const { program } = require('commander');
const prompts = require('prompts');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {exec} = require('child_process');




program
  .option('--first')
  .option('-s, --separator <char>');

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
        // mkdir /tmp/mytemporaryfolder
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hexapinod'));
        // cd /tmp/mytemporaryfolder
        // git clone https://github.com/cecric/hexapinod.git
        const responseExec1 = await hexaExec('cd ' + tmpDir + '; git clone https://github.com/cecric/hexapinod.git;');
        console.log(responseExec1);
        newDir = path.resolve(path.join('./', path.normalize(_newProjectName)));
        fs.mkdirSync(newDir, {recursive: true});
        // cd ./hexapinod
        // git archive --format=tar.gz v1.1.0 > hexapinod-1.1.0.tar.gz
        // tar -xzf ./hexapinod-1.1.0.tar.gz -C /my/project/folder
        const responseExec2 = await hexaExec('cd ' + tmpDir + '/hexapinod ; git archive --format=tar.gz v1.1.0 > hexapinod-1.1.0.tar.gz ; tar -xzf ./hexapinod-1.1.0.tar.gz -C ' + newDir);
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
    const response = await prompts({
        type: 'text',
        name: 'value',
        message: 'Name of the project?',
        initial: 'my-hexapinod-project',
        validate: value => !!value
      }, {onCancel});
    const projectPath = await initProject(response['value']);
    let rawPackageData = fs.readFileSync(projectPath + '/package.json');
    let packageData = JSON.parse(rawPackageData);
    packageData['name'] = response['value'];
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
    packageData['version'] = response['version'];
    packageData['description'] = response['description'];
    // Test : 
    // chai, chai-http, mocha, @types/mocha, @types/chai
    // jest
    packageData = await checkModuleActivation ('Test', {
        'chai-mocha': {
            'title': 'Chai/Mocha',
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
            'files_to_remove': [],
            'packages_to_remove': []
        },
        'apidoc': {
            'title': 'API Doc JS',
            'files_to_remove': [],
            'packages_to_remove': ['apidoc']
        },
        'typedoc': {
            'title': 'TypeDoc',
            'files_to_remove': [],
            'packages_to_remove': ['typedoc', 'typedoc-plugin-merge-modules', 'typedoc-plugin-rename-defaults']
        }
    }, packageData, projectPath);
    // Database 
    // MySQL, PostgreSQL
    packageData = await checkModuleActivation ('Database', {
        'mysql': {
            'title': 'MySQL',
            'files_to_remove': [],
            'packages_to_remove': []
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
            'files_to_remove': [],
            'packages_to_remove': []
        },
        'typeorm': {
            'title': 'TypeORM',
            'files_to_remove': [],
            'packages_to_remove': ['typeorm']
        }
    }, packageData, projectPath);

    let data = JSON.stringify(packageData, null, 2);
    fs.rmSync(projectPath + '/package-lock.json');
    fs.writeFileSync(projectPath + '/package.json', data);
    console.log('project initialized');
}



async function checkModuleActivation (_name, _choices, _packageData,  _projectPath) {
    const selectChoices = Object.keys(_choices).map(val => {return {'title': _choices[val]['title'], 'value': val}});
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
            for (let p = 0; p < _choices[selectChoices[i]['value']]['files_to_remove'].length; p++) {
                const filepath = _choices[selectChoices[i]['value']]['files_to_remove'][p];
                fs.rmSync(_projectPath + '/' + filepath);
            }
        }
    }
    return _packageData;
}


// Socket IO
// socket.io
// With Redis
// @socket.io/redis-adapter, redis



// Sample ?

// Auth Sample ?


initialize ();