// declare stomp client
let stompCliente = null;

// function to suscribe to the broker
const onConnectSocket = () => {
    stompCliente.subscribe('/tema/mensajes', (mensaje) => {
        mostrarMensaje(mensaje.body);
    });
};

// what to do when websocket closes
const onWebSocketClose = () => {
    if (stompCliente !== null) {
        stompCliente.deactivate();
    }
};

// function to connect to websocket
const conectarWS = () => {
    // Avoid having many open connections
    onWebSocketClose();

    // Create client
    stompCliente = new StompJs.Client({
        webSocketFactory: () => new WebSocket('ws://localhost:8080/websocket')
    });
    stompCliente.onConnect = onConnectSocket;
    stompCliente.onWebSocketClose = onWebSocketClose;
    stompCliente.activate();
};

// function to send message
const enviarMensaje = () => {
    // Identify elements
    let txtNombre = document.getElementById('txtNombre');
    let txtMensaje = document.getElementById('txtMensaje');

    // publish message
    stompCliente.publish({
        destination: '/app/envio',
        body: JSON.stringify({
            nombre: txtNombre.value,
            contenido: txtMensaje.value
        })
    });
};

// function to show message
const mostrarMensaje = (mensaje) => {
    // parse message from JSON
    const body = JSON.parse(mensaje);
    // get elements from html
    const ULMensajes = document.getElementById('ULMensajes');
    // Add message creating 'li' elements
    const mensajeLI = document.createElement('li');
    mensajeLI.classList.add('list-group-item');
    mensajeLI.innerHTML = `<strong>${body.nombre}</strong>: ${body.contenido}`;
    ULMensajes.appendChild(mensajeLI);
};

// Event when all DOM Content is loaded
document.addEventListener('DOMContentLoaded', () => {
    const btnEnviar = document.getElementById('btnEnviar');
    btnEnviar.addEventListener('click', (e) => {
        e.preventDefault();
        enviarMensaje();
    });
    conectarWS();
});