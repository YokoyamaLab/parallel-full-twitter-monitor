import { io } from 'socket.io-client';
import terminal_kit from 'terminal-kit';
import { DateTime } from 'luxon';
import { CronJob } from 'cron';
import uniqid from 'uniqid';
import path from 'path';
import fs from 'fs';

const { terminal } = terminal_kit;
const workingDirectory = process.cwd();
const HOME_DIR = process.env[process.platform == "win32" ? "USERPROFILE" : "HOME"];

let CUR_STATUS = "disconnect";

let doubleCTRL_C = false;
terminal.on('key', async function (name, matches, data) {
    if (name === 'CTRL_C') {
        if (!doubleCTRL_C) {
            doubleCTRL_C = true;
            terminal('\nQuit? [Y|n]\n');
            let yn = await terminal.yesOrNo({ yes: ['y', 'ENTER'], no: ['n'] }).promise;
            if (yn) {
                process.exit();
            } else {
                doubleCTRL_C = false;
            }
        } else {
            process.exit();
        }
    }
});

const monitorIdFile = path.join(HOME_DIR, ".parallel-full-twutter");
const monitorId = fs.existsSync(monitorIdFile) ? fs.readFileSync(monitorIdFile, { encoding: 'utf8' }) : uniqid("PFT");
if (!fs.existsSync(monitorIdFile)) {
    fs.writeFileSync(monitorIdFile, monitorId, { flag: 'w+' });
}
terminal('Parallel Full Twitter Server URL:\n');
let serverURL = await terminal.inputField({
    default: "ws://tokyo004:45803/"
}).promise;
terminal.clear();

const socket = io(serverURL);

socket.on('connect', function () {
    CUR_STATUS = "connect";
    var job = new CronJob('*/5 * * * * *', function () {
        socket.emit("joblist", {
            monitorId: monitorId
        });
    }, null, true);
    job.start();
    socket.on("disconnect", async (msg) => {
        CUR_STATUS = "disconnect";
        job.stop();
        showDisconnecedAlert();
    });
    socket.on("critical-error", (msg) => {
        terminal.red.bgWhite.bold(" [ERROR] ");
        terminal.white.bgRed.bold(" " + msg.message + "\n");
        console.error("process exit is called.");
        terminal.processExit();
    })
    socket.on('joblist-return', (msg) => {
        console.log("ongoing", msg.ongoing);
        console.log("suspended", msg.suspended);
        console.log("done", msg.done);
    });
    socket.on("monitor-return", async (msg) => {
        if (msg.server_status != "running") {
            showDisconnecedAlert();
            setTimeout(() => {
                terminal.cyan.bold('Reconnect!\n');
                socket.emit('monitor', {
                    monitorId: monitorId
                });
            }, 5000)
        } else {
            let command = await showTopMenu();
            switch (command) {
                case 'New Query':
                    showNewQuery();
                    break;
                case 'Resume Query':
                    showResumeQuery();
                    break;
                case 'Upload Result':
                    showUploadResult();
                    break;
                case 'Quit':
                    showQuit();
                    break;
                default:
                //Never Reach Here
            }
        }
    });
    socket.emit('monitor', {
        monitorId: monitorId
    });
});


function showHead() {
    terminal.clear();
    terminal.white.bgBlue.bold.italic('Welcom to the Parallel Full Twitter Serach Engine!\n');
}
async function showTopMenu() {
    showHead()
    var items = ['New Query', 'Resume Query', 'Upload Results','System Health', 'Quit'];
    var newQuery = ['Interactive Query', 'Query from JSON text', 'Query from JSON file', 'Query from History'];
    var options = {
        y: 2,
        fillIn: true,
        style: terminal.inverse,
        selectedStyle: terminal.dim.blue.bgGreen
    };
    let command = await terminal.singleLineMenu(items, options).promise;
    showHead()
    terminal.white.bgGreen.bold(command.selectedText + "\n");
    return command.selectedText;
}

async function showDisconnecedAlert() {
    showHead();
    terminal.white.bgRed.bold("Disconnected!\n");
}
async function showNewQuery(){
    showHead();
    socket.emit('query', {
        monitor: workingDirectory,
        queryId: monitorId + "_" + uniqid(),
        from: DateTime.fromFormat("2020/04/30 12:00", "yyyy/MM/dd HH:mm").toISO(),
        to: DateTime.fromFormat("2020/07/01 12:00", "yyyy/MM/dd HH:mm").toISO(),
        target: "text",
        keywords: ["コロナ"],
        lang: "ja",
        filters: []
    });
}

async function showResumeQuery(){
    showHead();
    terminal.white.bgRed.bold("Not Yet\n");
}

async function showUploadResult(doneTasks){
    let file = await term.singleColumnMenu([doneTasks]);
    console.log(file);
}

async function showQuit(){}