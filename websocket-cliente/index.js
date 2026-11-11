// declare stomp client
let stompCliente = null;

// function to suscribe to the broker
const onConnectSocket = () => {
    stompCliente.subscribe('/tema/mensajes', (mensaje) => {
        mostrarMensaje(mensaje.body);
    });
    stompCliente.subscribe('/tema/usuarios', (mensaje) => {
        mostrarUsuarios(JSON.parse(mensaje.body));
    });
    stompCliente.subscribe('/tema/privados', (mensaje) => {
        recibirPrivado(mensaje.body);
    });
    stompCliente.subscribe('/tema/entidades', (mensaje) => {
        recibirEntidad(mensaje.body);
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

let miNombre = null;
let destinatario = null;      // null = todos
let usuariosConectados = [];

const registrarse = () => {
    const nombre = document.getElementById('txtNombre').value.trim();
    if (nombre === '') {
        alert('Escribe tu nombre');
        return;
    }
    miNombre = nombre;
    document.getElementById('txtNombre').disabled = true;
    stompCliente.publish({
        destination: '/app/registro',
        body: JSON.stringify({ nombre: miNombre })
    });
};

const mostrarUsuarios = (lista) => {
    usuariosConectados = lista;
    if (destinatario !== null && !lista.includes(destinatario)) {
        destinatario = null;
    }

    const ul = document.getElementById('ULUsuarios');
    ul.innerHTML = '';

    [null, ...lista].forEach((nombre) => {
        const li = document.createElement('li');
        li.classList.add('list-group-item');
        if (nombre === destinatario) li.classList.add('active');
        li.textContent = nombre === null ? 'Todos' : nombre;

        if (nombre === miNombre && nombre !== null) {
            li.textContent += ' (tú)';
        } else {
            li.style.cursor = 'pointer';
            li.addEventListener('click', () => {
                destinatario = nombre;
                mostrarUsuarios(usuariosConectados);
            });
        }
        ul.appendChild(li);
    });

    document.getElementById('lblDestinatario').textContent =
        destinatario === null ? 'Todos' : destinatario;
};

const enviarPrivado = () => {
    const txtMensaje = document.getElementById('txtMensaje');
    if (miNombre === null) {
        alert('Primero registra tu nombre');
        return;
    }
    if (destinatario === null) {
        alert('Selecciona un usuario de la lista');
        return;
    }
    stompCliente.publish({
        destination: '/app/privado',
        body: JSON.stringify({
            nombre: miNombre,
            destinatario: destinatario,
            contenido: txtMensaje.value
        })
    });
    mostrarMensaje(JSON.stringify({
        nombre: 'Tú (privado a ' + destinatario + ')',
        contenido: txtMensaje.value
    }));
    txtMensaje.value = '';
};

const recibirPrivado = (cuerpo) => {
    const body = JSON.parse(cuerpo);
    if (body.destinatario === miNombre) {
        mostrarMensaje(JSON.stringify({
            nombre: body.nombre + ' (privado)',
            contenido: body.contenido
        }));
    }
};

const enviarEntidad = () => {
    if (miNombre === null) {
        alert('Primero registra tu nombre');
        return;
    }
    const mensaje = {
        nombre: miNombre,
        destinatario: destinatario,   // null = todos
        producto: {
            id: parseInt(document.getElementById('txtProdId').value),
            nombre: document.getElementById('txtProdNombre').value,
            precio: parseFloat(document.getElementById('txtProdPrecio').value),
            stock: parseInt(document.getElementById('txtProdStock').value)
        }
    };
    stompCliente.publish({
        destination: '/app/entidad',
        body: JSON.stringify(mensaje)
    });
    if (destinatario !== null) {
        agregarEntidad(mensaje);
    }
};

const recibirEntidad = (cuerpo) => {
    const body = JSON.parse(cuerpo);
    if (body.destinatario === null || body.destinatario === miNombre) {
        agregarEntidad(body);
    }
};

const agregarEntidad = (msg) => {
    const tr = document.createElement('tr');
    [
        msg.nombre,
        msg.destinatario === null ? 'Todos' : msg.destinatario,
        msg.producto.id,
        msg.producto.nombre,
        msg.producto.precio,
        msg.producto.stock
    ].forEach((valor) => {
        const td = document.createElement('td');
        td.textContent = valor;
        tr.appendChild(td);
    });
    document.getElementById('tbodyEntidades').appendChild(tr);
};

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnRegistrar').addEventListener('click', (e) => {
        e.preventDefault();
        registrarse();
    });
    document.getElementById('btnEnviarPrivado').addEventListener('click', (e) => {
        e.preventDefault();
        enviarPrivado();
    });
    document.getElementById('btnEnviarEntidad').addEventListener('click', (e) => {
        e.preventDefault();
        enviarEntidad();
    });
});