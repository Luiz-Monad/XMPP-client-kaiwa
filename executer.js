const { spawn } = require('child_process');
const kill = require('tree-kill');

exports.executer = function executer(cmdargs, cb) {
    const cmd = cmdargs[0];
    const args = cmdargs.slice(1);
    const child = spawn(cmd, args, { stdio: 'inherit', shell: true });
    child.on('error', (err) => {
        console.error(`Error running command: ${err}`);
        cb(err);
    });
    child.on('close', (code) => {
        if (code !== 0) {
            console.error(`command exited with code ${code}`);
            cb(new Error(`command exited with code ${code}`));
        } else {
            cb();
        }
    });
    child.treekill = () => {
        child.stdin?.end();
        child.stdout?.destroy();
        child.stderr?.destroy(); 
        kill(child.pid, 'SIGKILL', (err) => {
            if (err) {
                console.error('Failed to kill process tree:', err);
            } else {
                console.log('Successfully killed the webpack process tree');
            }
        });
    };
    return child;
}
