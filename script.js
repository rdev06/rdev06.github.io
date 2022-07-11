let peer;
const registerForm = document.getElementById('registerForm');
const loggedIn = document.getElementById('loggedIn');
const ready = document.getElementById('ready');
const free = document.getElementById('free');
const busy = document.getElementById('busy');
const callStatus = document.getElementById('status');
const remoteVideo = document.querySelector('#busy .remoteVideo');
const userId = localStorage.getItem('phone');

const SIGNAL = {
  DIALLING: 'DIALLING',
  CALLING: 'CALLING',
  RINGING: 'RINGING',
  TALKING: 'TALKING',
  REJECTED: 'REJECTED',
};

const connections = {};

if (userId) {
  registerForm.style.display = 'none';
  init();
} else {
  loggedIn.style.display = 'none';
}

function register() {
  const userId = document.getElementById('phone').value;
  localStorage.setItem('phone', userId);
  registerForm.style.display = 'none';
  loggedIn.style.display = 'block';
  init();
  return false;
}

function init() {
  const connectId = localStorage.getItem('phone');
  peer = new Peer(connectId);
  console.log('connected With', connectId);
  peer.on('connection', (conn) => {
    console.log('incoming peer connection!');
    let connected = false;
    conn.on('data', (data) => {
      console.log(`incoming received ${conn.peer} : ${data}`);
      if (data == SIGNAL.CALLING) {
        connected && conn.send(SIGNAL.RINGING);
      }
    });
    conn.on('open', () => {
      connected = true;
      connections[conn.peer] = conn;
      conn.send('hello!');
    });
  });

  peer.on('call', incomingCall);
  ready.style.display = 'block';
}

function call() {
  const toPhone = document.getElementById('toPhone').value;
  const withVideo = document.getElementById('withVideo').checked;
  const conn = peer.connect(toPhone);
  free.style.display = 'none';
  busy.style.display = 'block';
  let connected = false;
  conn.on('open', () => {
    connected = true;
    connections[conn.peer] = conn;
    conn.send('hi!');
    callStatus.innerHTML = SIGNAL.DIALLING;
    navigator.mediaDevices
      .getUserMedia({ video: withVideo, audio: true })
      .then((stream) => {
        const call = peer.call(toPhone, stream);
        connected && conn.send(SIGNAL.CALLING);
        callStatus.innerHTML = SIGNAL.CALLING;
        call.on('stream', function (remoteStream) {
          callStatus.innerHTML = SIGNAL.TALKING;
          remoteVideo.srcObject = remoteStream;
          // Show stream in some video/canvas element.
        });
      })
      .catch((err) => console.log('Failed to get local stream', err));
  });
  conn.on('data', (data) => {
    if (data == SIGNAL.RINGING) {
      callStatus.innerHTML = SIGNAL.RINGING;
    }
    if (data == SIGNAL.REJECTED) {
      callStatus.innerHTML = SIGNAL.REJECTED;
    }
    console.log(`out going received  ${conn.peer}:  ${data}`);
  });

  return false;
}

function incomingCall(call) {
  // Some action for answer
  const isPicked = confirm(`${call.peer} is calling`);
  if (isPicked) {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
      call.answer(stream); // Answer the call with an A/V stream.
      call.on('stream', function (remoteStream) {
        free.style.display = 'none';
        busy.style.display = 'block';
        callStatus.innerHTML = SIGNAL.TALKING;
        remoteVideo.srcObject = remoteStream;
        // Show stream in some video/canvas element.
      });
    }).catch(err => console.log('Failed to get local stream', err))
  } else {
    connections[call.peer].send(SIGNAL.REJECTED);
  }
}
