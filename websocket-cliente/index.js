// declare stomp client
let stompCliente = null;

// function to suscribe to the broker
const onConnectSocket = () => {
    stompCliente.subscribe('/topic/chat.publico', (mensaje) => {
        mostrarMensaje(mensaje.body);
    });
    stompCliente.subscribe('/topic/usuarios', (mensaje) => {
        mostrarUsuarios(JSON.parse(mensaje.body));
    });
    stompCliente.subscribe('/user/queue/mensajes', (mensaje) => {
        recibirPrivado(mensaje.body);
    });
    stompCliente.subscribe('/topic/productos', (mensaje) => {
        recibirEntidad(mensaje.body);
    });
    stompCliente.subscribe('/user/queue/productos', (mensaje) => {
        recibirEntidad(mensaje.body);
    });
    stompCliente.publish({
        destination: '/app/chat.registro',
        body: JSON.stringify({ nombre: miNombre, tipoMensaje: 'JOIN' })
    });
};

// what to do when websocket closes
const onWebSocketClose = () => {
    if (stompCliente !== null) {
        stompCliente.deactivate();
    }
};

// function to connect to websocket
const conectarWS = (nombre) => {
    // Avoid having many open connections
    onWebSocketClose();

    // Create client
    stompCliente = new StompJs.Client({
        webSocketFactory: () => new WebSocket('ws://localhost:8080/ws'),
        connectHeaders: { login: nombre }
    });
    stompCliente.onConnect = onConnectSocket;
    stompCliente.onWebSocketClose = onWebSocketClose;
    stompCliente.activate();
};

const websocketListo = () => {
    if (stompCliente === null || !stompCliente.connected) {
        alert('Espera a que se conecte el mensajero');
        return false;
    }
    return true;
};

// function to send message
const enviarMensaje = () => {
    if (miNombre === null || !websocketListo()) return;
    // Identify elements
    let txtNombre = document.getElementById('txtNombre');
    let txtMensaje = document.getElementById('txtMensaje');

    // publish message
    stompCliente.publish({
        destination: '/app/chat.publico',
        body: JSON.stringify({
            nombre: txtNombre.value,
            contenido: txtMensaje.value,
            tipoMensaje: 'CHAT'
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
    document.getElementById('btnRegistrar').disabled = true;
    conectarWS(miNombre);
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

    const textoDestino = destinatario === null ? 'Todos' : destinatario;
    document.getElementById('lblDestinatario').textContent = textoDestino;
    document.getElementById('lblDestinoProducto').textContent = textoDestino;
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
    if (!websocketListo()) return;
    stompCliente.publish({
        destination: '/app/chat.privado',
        body: JSON.stringify({
            nombre: miNombre,
            destino: destinatario,
            contenido: txtMensaje.value,
            tipoMensaje: 'CHAT'
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
    mostrarMensaje(JSON.stringify({
        nombre: body.nombre + ' (privado)',
        contenido: body.contenido
    }));
};

// Lee los datos del formulario y los convierte en un objeto producto
const leerProductoDelFormulario = (form) => {
    const datos = new FormData(form);
    return {
        id: parseInt(datos.get('id'), 10),
        nombre: datos.get('nombre').trim(),
        precio: parseFloat(datos.get('precio')),
        stock: parseInt(datos.get('stock'), 10)
    };
};

const enviarEntidad = (form) => {
    if (miNombre === null) {
        alert('Primero registra tu nombre');
        return;
    }
    if (stompCliente === null || !stompCliente.connected) {
        alert('No hay conexión con el servidor');
        return;
    }

    // El nombre no puede ser solo espacios
    const txtNombreProd = form.querySelector('#txtProdNombre');
    txtNombreProd.setCustomValidity(txtNombreProd.value.trim() === '' ? 'vacío' : '');

    // Validación del formulario (required, min, step, etc.)
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }

    const mensaje = {
        nombre: miNombre,
        destinatario: destinatario,   // null = todos
        producto: leerProductoDelFormulario(form)
    };
    stompCliente.publish({
        destination: '/app/producto.enviar',
        body: JSON.stringify(mensaje)
    });
    if (destinatario !== null) {
        agregarEntidad(mensaje);
    }

    // Limpia el formulario para capturar el siguiente producto
    form.reset();
    form.classList.remove('was-validated');
    form.querySelector('#txtProdId').focus();
};

const recibirEntidad = (cuerpo) => {
    const body = JSON.parse(cuerpo);
    agregarEntidad(body);
};

const agregarEntidad = (msg) => {
    const tr = document.createElement('tr');
    [
        msg.emisor,
        msg.destino === null ? 'Todos' : msg.destino,
        msg.id,
        msg.nombre,
        msg.destinatario === null ? 'Todos' : msg.destinatario,
        msg.producto.id,
        msg.producto.nombre,
        '$' + Number(msg.producto.precio).toFixed(2),
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
    const formProducto = document.getElementById('formProducto');
    formProducto.addEventListener('submit', (e) => {
        e.preventDefault();
        enviarEntidad(formProducto);
    });
    formProducto.addEventListener('reset', () => {
        formProducto.classList.remove('was-validated');
    });
});