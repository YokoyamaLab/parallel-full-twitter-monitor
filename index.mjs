import { io } from 'socket.io-client';
import { terminal } from 'terminal-kit';

terminal('Parallel Full Twitter Server URL:\n');
let serverURL = await terminal.inputField({
    defult: "ws://tokyo004:45803/"
}).promise;

const socket = io(URL);

socket.on('connect', function () {
    socket.once("monitor-return", (msg) => {
        console.log(msg);
    });
    socket.emit('monitor', {});
});